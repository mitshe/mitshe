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
          const integrations = await this.integrationsService.findAll(orgId);
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
        name: 'integration_create',
        description:
          'Connect a new integration (GitHub, GitLab, Jira, Slack, etc.). ' +
          'If the integration already exists, it will update the credentials. ' +
          'Use this when the user provides an API token or wants to connect a service.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Integration type',
              enum: [
                'GITHUB',
                'GITLAB',
                'JIRA',
                'SLACK',
                'DISCORD',
                'TELEGRAM',
                'YOUTRACK',
                'LINEAR',
                'TRELLO',
                'OBSIDIAN',
              ],
            },
            token: {
              type: 'string',
              description:
                'API token / Personal Access Token / Bot token for the service',
            },
            url: {
              type: 'string',
              description:
                'Base URL (required for Jira, YouTrack, GitLab self-hosted). ' +
                'E.g. https://your-domain.atlassian.net for Jira',
            },
          },
          required: ['type', 'token'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const type = input.type as string;
          const token = input.token as string;
          const url = input.url as string | undefined;

          const config: Record<string, string> = {};
          if (type === 'GITHUB' || type === 'GITLAB' || type === 'LINEAR') {
            config.accessToken = token;
          } else if (type === 'JIRA') {
            config.apiToken = token;
            if (url) config.baseUrl = url;
          } else if (type === 'SLACK') {
            config.botToken = token;
          } else if (type === 'DISCORD') {
            config.webhookUrl = token;
          } else if (type === 'TELEGRAM') {
            config.botToken = token;
          } else if (type === 'YOUTRACK') {
            config.token = token;
            if (url) config.baseUrl = url;
          } else {
            config.token = token;
          }

          try {
            const integration = await this.integrationsService.create(orgId, {
              type: type as any,
              config,
            });
            return {
              content: JSON.stringify({
                id: integration.id,
                type: integration.type,
                status: integration.status,
                message: `${type} connected successfully.`,
              }),
            };
          } catch (error) {
            return {
              content: `Failed to connect ${type}: ${(error as Error).message}`,
              isError: true,
            };
          }
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
