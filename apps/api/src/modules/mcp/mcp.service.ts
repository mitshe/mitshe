import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition } from '../../ports/ai-provider.port';
import { McpTool, McpToolResult } from './mcp.types';
import { SessionTools } from './tools/session.tools';
import { WorkflowTools } from './tools/workflow.tools';
import { TaskTools } from './tools/task.tools';
import { RepositoryTools } from './tools/repository.tools';
import { IntegrationTools } from './tools/integration.tools';
import { SnapshotTools } from './tools/snapshot.tools';
import { SkillTools } from './tools/skill.tools';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly toolMap = new Map<string, McpTool>();

  constructor(
    private readonly sessionTools: SessionTools,
    private readonly workflowTools: WorkflowTools,
    private readonly taskTools: TaskTools,
    private readonly repositoryTools: RepositoryTools,
    private readonly integrationTools: IntegrationTools,
    private readonly snapshotTools: SnapshotTools,
    private readonly skillTools: SkillTools,
  ) {
    this.registerTools();
  }

  private registerTools() {
    const allTools = [
      ...this.sessionTools.getTools(),
      ...this.workflowTools.getTools(),
      ...this.taskTools.getTools(),
      ...this.repositoryTools.getTools(),
      ...this.integrationTools.getTools(),
      ...this.snapshotTools.getTools(),
      ...this.skillTools.getTools(),
    ];

    for (const tool of allTools) {
      this.toolMap.set(tool.name, tool);
    }

    this.logger.log(`Registered ${this.toolMap.size} MCP tools`);
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.toolMap.values()).map(
      ({ execute: _, ...def }) => def,
    );
  }

  getToolNames(): string[] {
    return Array.from(this.toolMap.keys());
  }

  async executeTool(
    toolName: string,
    organizationId: string,
    userId: string,
    input: Record<string, unknown>,
  ): Promise<McpToolResult> {
    const tool = this.toolMap.get(toolName);
    if (!tool) {
      return { content: `Unknown tool: ${toolName}`, isError: true };
    }

    try {
      this.logger.debug(`Executing tool ${toolName} for org ${organizationId}`);
      const result = await tool.execute(organizationId, userId, input);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Tool ${toolName} failed: ${message}`);
      return { content: `Tool error: ${message}`, isError: true };
    }
  }
}
