import { ToolDefinition } from '../../ports/ai-provider.port';

export interface McpToolResult {
  content: string;
  isError?: boolean;
}

export interface McpTool extends ToolDefinition {
  execute: (
    organizationId: string,
    userId: string,
    input: Record<string, unknown>,
  ) => Promise<McpToolResult>;
}
