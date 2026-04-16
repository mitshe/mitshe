import { Injectable } from '@nestjs/common';
import { RepositoriesService } from '../../repositories/services/repositories.service';
import { McpTool, McpToolResult } from '../mcp.types';

@Injectable()
export class RepositoryTools {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  getTools(): McpTool[] {
    return [
      {
        name: 'repository_list',
        description:
          'List all synced repositories. Shows name, provider, clone URL, default branch.',
        inputSchema: {
          type: 'object',
          properties: {
            isActive: {
              type: 'string',
              description: 'Filter by active status (true/false)',
            },
          },
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const repos = await this.repositoriesService.findAll(orgId, {
            isActive:
              input.isActive !== undefined
                ? input.isActive === 'true'
                : undefined,
          });
          return {
            content: JSON.stringify(
              repos.map((r) => ({
                id: r.id,
                name: r.name,
                fullPath: r.fullPath,
                provider: r.provider,
                defaultBranch: r.defaultBranch,
                webUrl: r.webUrl,
              })),
            ),
          };
        },
      },
      {
        name: 'repository_list_remote',
        description:
          'List repositories available from connected Git integrations (GitHub/GitLab) that are not yet synced.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (orgId): Promise<McpToolResult> => {
          const repos =
            await this.repositoriesService.listRemoteRepositories(orgId);
          return { content: JSON.stringify(repos) };
        },
      },
      {
        name: 'repository_sync',
        description:
          'Sync repositories from all connected Git integrations.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (orgId): Promise<McpToolResult> => {
          const result = await this.repositoriesService.syncAll(orgId);
          return {
            content: JSON.stringify({
              message: `Synced ${result.totalSynced} repositories from ${result.integrations} integrations.`,
              ...result,
            }),
          };
        },
      },
    ];
  }
}
