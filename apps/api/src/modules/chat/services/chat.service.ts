import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';
import { McpService } from '../../mcp/mcp.service';
import {
  Message,
  ToolResultContent,
  ToolUseContent,
} from '../../../ports/ai-provider.port';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateConversationDto,
} from '../dto/chat.dto';

const SYSTEM_PROMPT = `You are mitshe AI assistant — a workspace manager for AI coding agents.

In mitshe, we call isolated workspaces "threads" (each task gets its own thread).
Internally the API uses "session" but always say "thread" to the user.

CRITICAL RULES:
1. ALWAYS use tools to perform actions. NEVER claim you did something without calling the tool.
2. Only describe results AFTER you receive the tool response. Never fabricate IDs or statuses.
3. If a tool call fails, tell the user what went wrong honestly.
4. After completing tool calls, ALWAYS end with a text summary. Never end with only tool calls.

Available tools:
- session_* — Create/manage threads (isolated Docker containers with terminal, browser, git)
  - session_create — Create thread. Options: repositoryIds, branch, localPath, skillIds, baseImageId (snapshot)
  - session_agent — Send prompt to Claude Code inside a running thread
- workflow_* — Create, run, manage workflows (automated pipelines)
- task_* — Create, update, track tasks
- repository_* — List/sync Git repositories from connected providers
- integration_* — Connect/test integrations (GitHub, GitLab, Jira, Slack)
  - integration_create — Connect a service with API token
- snapshot_* — Create/list/delete snapshots (saved thread states)
- skill_* — Create/list/update/delete skills (Claude Code slash commands)

Key concepts:
- THREAD = isolated Docker container with Claude Code, terminal, browser (Chrome), and git
- SNAPSHOT = saved thread state (tools, repos, configs) — reusable base for new threads
- SKILL = reusable instructions installed as Claude Code slash commands
- Every thread has a browser tab with Google Chrome
- Threads can mount local folders and select specific git branches
- Users can push code and create PRs directly from threads

Onboarding:
1. Connect GitHub/GitLab: ask for Personal Access Token → integration_create
2. Sync repositories: repository_sync
3. Create a thread with repos, branch, and snapshot

Workflow node types (for building automations):
- action:session_create — Create thread (name, repositoryIds, snapshotId, instructions)
- action:session_agent — Send prompt to Claude Code in thread (prompt, provider, timeout)
- action:session_exec — Execute shell command in thread (command, timeout)
- action:session_stop — Stop/delete thread (delete: boolean)

Be concise. NEVER ask the user to go to a settings page — do it yourself with tools.`;

const MAX_TOOL_ITERATIONS = 15;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactoryService,
    private readonly mcpService: McpService,
  ) {}

  async createConversation(
    organizationId: string,
    userId: string,
    dto: CreateConversationDto,
  ) {
    return this.prisma.chatConversation.create({
      data: {
        organizationId,
        userId,
        title: dto.title,
        aiCredentialId: dto.aiCredentialId,
        model: dto.model,
      },
    });
  }

  async findAllConversations(
    organizationId: string,
    userId: string,
    limit = 8,
  ) {
    return this.prisma.chatConversation.findMany({
      where: { organizationId, userId },
      include: {
        _count: { select: { messages: true } },
        aiCredential: { select: { id: true, provider: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async findConversation(organizationId: string, userId: string, id: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id, organizationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        aiCredential: { select: { id: true, provider: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async updateConversation(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateConversationDto,
  ) {
    const conversation = await this.findConversation(
      organizationId,
      userId,
      id,
    );

    return this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { title: dto.title },
    });
  }

  async deleteConversation(organizationId: string, userId: string, id: string) {
    const conversation = await this.findConversation(
      organizationId,
      userId,
      id,
    );
    return this.prisma.chatConversation.delete({
      where: { id: conversation.id },
    });
  }

  async sendMessage(
    organizationId: string,
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<{
    userMessage: any;
    assistantMessage: any;
    toolCalls: Array<{ name: string; input: any; result: any }>;
  }> {
    const conversation = await this.findConversation(
      organizationId,
      userId,
      conversationId,
    );

    // Resolve AI provider
    const credentialId = dto.aiCredentialId || conversation.aiCredentialId;
    let aiProvider;
    try {
      if (credentialId) {
        aiProvider = await this.adapterFactory.createAIProviderFromCredential(
          organizationId,
          credentialId,
        );
      } else {
        aiProvider =
          await this.adapterFactory.getDefaultAIProvider(organizationId);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load AI provider: ${msg}`);
      throw new BadRequestException(
        `Failed to load AI provider. The API key may be corrupted or the ENCRYPTION_KEY changed. Please re-add your AI credential in Settings → AI Providers. (${msg})`,
      );
    }

    if (!aiProvider) {
      throw new BadRequestException(
        'No AI provider configured. Add an AI credential in Settings → AI Providers.',
      );
    }

    // Save user message
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.content,
      },
    });

    // Build message history from DB
    const messages = this.buildMessages(conversation.messages, dto.content);

    // Get MCP tools as AI tool definitions
    const tools = this.mcpService.getToolDefinitions();

    // Tool use loop
    const allToolCalls: Array<{
      name: string;
      input: any;
      result: any;
    }> = [];
    let currentMessages = messages;
    let finalContent = '';
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await aiProvider.completeWithTools(
        currentMessages,
        tools,
        {
          systemPrompt: SYSTEM_PROMPT,
          model: dto.model || conversation.model || undefined,
          maxTokens: 4096,
        },
      );

      // Collect text content
      finalContent = response.content;

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      // Execute tool calls
      const toolResults: ToolResultContent[] = [];
      const toolUseBlocks: ToolUseContent[] = [];

      for (const toolCall of response.toolCalls) {
        const result = await this.mcpService.executeTool(
          toolCall.name,
          organizationId,
          userId,
          toolCall.input,
        );

        allToolCalls.push({
          name: toolCall.name,
          input: toolCall.input,
          result: (() => {
            try {
              return JSON.parse(result.content);
            } catch {
              return { message: result.content };
            }
          })(),
        });

        toolUseBlocks.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.name,
          input: toolCall.input,
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: result.content,
          is_error: result.isError,
        });
      }

      // Append assistant message with tool use + tool results for next iteration
      currentMessages = [
        ...currentMessages,
        {
          role: 'assistant' as const,
          content: [
            ...(response.content
              ? [{ type: 'text' as const, text: response.content }]
              : []),
            ...toolUseBlocks,
          ],
        },
        {
          role: 'user' as const,
          content: toolResults,
        },
      ];

      // If stop reason is not tool_use, we're done
      if (response.stopReason !== 'tool_use') {
        break;
      }

      // If all tool calls errored, break to avoid infinite loop
      const allErrored = toolResults.every((r) => r.is_error);
      if (allErrored) {
        this.logger.warn(
          `All ${toolResults.length} tool calls returned errors — breaking loop`,
        );
        break;
      }
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      this.logger.warn(
        `Chat reached MAX_TOOL_ITERATIONS (${MAX_TOOL_ITERATIONS})`,
      );
    }

    // Save assistant message with tool calls
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: finalContent,
        toolUse: allToolCalls.length > 0 ? (allToolCalls as any) : undefined,
      },
    });

    // Auto-generate title from first message if not set
    if (!conversation.title && dto.content.length > 0) {
      const title = dto.content.slice(0, 100);
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }

    return { userMessage, assistantMessage, toolCalls: allToolCalls };
  }

  private buildMessages(
    existingMessages: Array<{ role: string; content: string; toolUse: any }>,
    newUserContent: string,
  ): Message[] {
    const messages: Message[] = [];

    for (const msg of existingMessages) {
      messages.push({
        role: msg.role as any,
        content: msg.content,
      });
    }

    messages.push({
      role: 'user',
      content: newUserContent,
    });

    return messages;
  }
}
