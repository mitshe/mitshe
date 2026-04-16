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

const SYSTEM_PROMPT = `You are mitshe AI assistant — a helpful AI that manages development workflows, sessions, tasks, and integrations.

You have access to tools that let you:
- Create and manage agent sessions (Docker containers with AI agents like Claude Code)
- Create, run, and manage workflows (automated pipelines)
- Manage tasks (create, update, track progress)
- List and sync repositories from connected Git providers (GitHub, GitLab)
- View connected integrations (Jira, Slack, etc.)

When the user asks you to do something, use the appropriate tools. Be concise and helpful.
When you create or modify something, confirm what you did and provide the relevant IDs/links.
If you're unsure what the user wants, ask for clarification.`;

const MAX_TOOL_ITERATIONS = 10;

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
