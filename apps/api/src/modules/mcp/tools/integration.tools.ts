import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '../../integrations/services/integrations.service';
import { McpTool, McpToolResult } from '../mcp.types';

@Injectable()
export class IntegrationTools {
  constructor(private readonly integrationsService: IntegrationsService) {}

  getTools(): McpTool[] {
    return [
      {
        name: 'integration_list',
        description:
          'List all connected integrations (Jira, GitHub, GitLab, Slack, Discord, etc.).',
        inputSchema: { type: 'object', properties: {} },
        execute: async (orgId): Promise<McpToolResult> => {
          const integrations =
            await this.integrationsService.findAll(orgId);
          return {
            content: JSON.stringify(
              integrations.map((i) => ({
                id: i.id,
                type: i.type,
                name: (i as any).name,
                status: i.status,
                lastSyncAt: (i as any).lastSyncAt,
              })),
            ),
          };
        },
      },
      {
        name: 'integration_test',
        description: 'Test connection of a specific integration.',
        inputSchema: {
          type: 'object',
          properties: {
            integrationId: {
              type: 'string',
              description: 'Integration ID',
            },
          },
          required: ['integrationId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const result = await this.integrationsService.testConnection(
            orgId,
            input.integrationId as string,
          );
          return { content: JSON.stringify(result) };
        },
      },
    ];
  }
}
