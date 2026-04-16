import { Injectable } from '@nestjs/common';
import { SessionsService } from '../../sessions/services/sessions.service';
import { SessionContainerService } from '../../sessions/services/session-container.service';
import { McpTool, McpToolResult } from '../mcp.types';

@Injectable()
export class SessionTools {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly containerService: SessionContainerService,
  ) {}

  getTools(): McpTool[] {
    return [
      {
        name: 'session_list',
        description:
          'List all agent sessions. Can filter by status (CREATING, RUNNING, PAUSED, COMPLETED, FAILED) and projectId.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status',
              enum: ['CREATING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'],
            },
            projectId: {
              type: 'string',
              description: 'Filter by project ID',
            },
          },
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const result = await this.sessionsService.findAll(orgId, {
            status: input.status as any,
            projectId: input.projectId as string,
          });
          return {
            content: JSON.stringify(
              result.sessions.map((s) => ({
                id: s.id,
                name: s.name,
                status: s.status,
                project: (s as any).project?.name,
                enableDocker: s.enableDocker,
                createdAt: s.createdAt,
                lastActiveAt: s.lastActiveAt,
              })),
            ),
          };
        },
      },
      {
        name: 'session_get',
        description: 'Get details of a specific agent session by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session ID',
            },
          },
          required: ['sessionId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const session = await this.sessionsService.findOne(
            orgId,
            input.sessionId as string,
          );
          return { content: JSON.stringify(session) };
        },
      },
      {
        name: 'session_create',
        description:
          'Create a new agent session with repositories, integrations, and optional Docker-in-Docker support.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Session name' },
            repositoryIds: {
              type: 'string',
              description: 'Comma-separated repository IDs to attach',
            },
            projectId: { type: 'string', description: 'Project ID' },
            aiCredentialId: { type: 'string', description: 'AI credential ID' },
            integrationIds: {
              type: 'string',
              description: 'Comma-separated integration IDs',
            },
            instructions: {
              type: 'string',
              description: 'System instructions for the agent',
            },
            enableDocker: {
              type: 'string',
              description: 'Enable Docker-in-Docker (true/false)',
            },
            baseImageId: {
              type: 'string',
              description: 'Base image ID to start from',
            },
          },
          required: ['name'],
        },
        execute: async (orgId, userId, input): Promise<McpToolResult> => {
          const repoIds = input.repositoryIds
            ? (input.repositoryIds as string).split(',').map((s) => s.trim())
            : [];
          const integrationIds = input.integrationIds
            ? (input.integrationIds as string).split(',').map((s) => s.trim())
            : undefined;

          const session = await this.sessionsService.create(orgId, userId, {
            name: input.name as string,
            repositoryIds: repoIds,
            projectId: input.projectId as string,
            aiCredentialId: input.aiCredentialId as string,
            integrationIds,
            instructions: input.instructions as string,
            enableDocker: input.enableDocker === 'true',
          });

          return {
            content: JSON.stringify({
              id: session.id,
              name: session.name,
              status: session.status,
              message: `Session "${session.name}" created successfully.`,
            }),
          };
        },
      },
      {
        name: 'session_stop',
        description: 'Stop a running session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID' },
          },
          required: ['sessionId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const session = await this.sessionsService.findOne(
            orgId,
            input.sessionId as string,
          );
          if (session.containerId) {
            await this.containerService.stopContainer(session.containerId);
          }
          await this.sessionsService.updateStatus(session.id, 'COMPLETED');
          return {
            content: JSON.stringify({
              message: `Session "${session.name}" stopped.`,
            }),
          };
        },
      },
      {
        name: 'session_pause',
        description: 'Pause a running session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID' },
          },
          required: ['sessionId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const session = await this.sessionsService.findOne(
            orgId,
            input.sessionId as string,
          );
          await this.sessionsService.updateStatus(session.id, 'PAUSED');
          return {
            content: JSON.stringify({
              message: `Session "${session.name}" paused.`,
            }),
          };
        },
      },
      {
        name: 'session_resume',
        description: 'Resume a paused or stopped session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID' },
          },
          required: ['sessionId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const session = await this.sessionsService.findOne(
            orgId,
            input.sessionId as string,
          );
          if (session.containerId) {
            await this.containerService.restartContainer(session.containerId);
          }
          await this.sessionsService.updateStatus(session.id, 'RUNNING');
          return {
            content: JSON.stringify({
              message: `Session "${session.name}" resumed.`,
            }),
          };
        },
      },
      {
        name: 'session_clone',
        description:
          'Clone an existing session (creates a snapshot and new session with same workspace).',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID to clone' },
          },
          required: ['sessionId'],
        },
        execute: async (orgId, userId, input): Promise<McpToolResult> => {
          const cloned = await this.sessionsService.clone(
            orgId,
            userId,
            input.sessionId as string,
          );
          return {
            content: JSON.stringify({
              id: cloned.id,
              name: cloned.name,
              status: cloned.status,
              message: `Session cloned as "${cloned.name}".`,
            }),
          };
        },
      },
      {
        name: 'session_exec',
        description:
          'Execute a shell command in a running session container. Returns stdout and exit code.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID' },
            command: {
              type: 'string',
              description: 'Shell command to execute',
            },
          },
          required: ['sessionId', 'command'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const session = await this.sessionsService.findOne(
            orgId,
            input.sessionId as string,
          );
          if (!session.containerId) {
            return {
              content: 'Session has no running container.',
              isError: true,
            };
          }
          const stdout = await this.containerService.execCommand(
            session.containerId,
            ['bash', '-c', input.command as string],
          );
          return {
            content: JSON.stringify({ stdout }),
          };
        },
      },
      {
        name: 'session_delete',
        description: 'Delete a session and its container.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID' },
          },
          required: ['sessionId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const session = await this.sessionsService.remove(
            orgId,
            input.sessionId as string,
          );
          return {
            content: JSON.stringify({
              message: `Session "${session.name}" deleted.`,
            }),
          };
        },
      },
    ];
  }
}
