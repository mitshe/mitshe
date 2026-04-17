import { Injectable } from '@nestjs/common';
import { ImagesService } from '../../images/services/images.service';
import { McpTool, McpToolResult } from '../mcp.types';

@Injectable()
export class SnapshotTools {
  constructor(private readonly imagesService: ImagesService) {}

  getTools(): McpTool[] {
    return [
      {
        name: 'snapshot_list',
        description:
          'List all snapshots (saved container images). Shows name, status, source session, and size.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (orgId): Promise<McpToolResult> => {
          const snapshots = await this.imagesService.findAll(orgId);
          return {
            content: JSON.stringify(
              snapshots.map((s) => ({
                id: s.id,
                name: s.name,
                status: s.status,
                sourceSession: (s as Record<string, unknown>).sourceSession,
                enableDocker: s.enableDocker,
                createdAt: s.createdAt,
              })),
            ),
          };
        },
      },
      {
        name: 'snapshot_create',
        description:
          'Create a snapshot from a running session. The session must have a running container.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Snapshot name',
            },
            description: {
              type: 'string',
              description: 'Snapshot description',
            },
            sessionId: {
              type: 'string',
              description: 'Session ID to snapshot',
            },
          },
          required: ['name', 'sessionId'],
        },
        execute: async (orgId, userId, input): Promise<McpToolResult> => {
          const snapshot = await this.imagesService.create(orgId, userId, {
            name: input.name as string,
            description: input.description as string,
            sessionId: input.sessionId as string,
          });
          return {
            content: JSON.stringify({
              id: snapshot.id,
              name: snapshot.name,
              status: snapshot.status,
              message: `Snapshot "${snapshot.name}" is being created. Status will change to READY when done.`,
            }),
          };
        },
      },
      {
        name: 'snapshot_get',
        description: 'Get details of a specific snapshot.',
        inputSchema: {
          type: 'object',
          properties: {
            snapshotId: {
              type: 'string',
              description: 'Snapshot ID',
            },
          },
          required: ['snapshotId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const snapshot = await this.imagesService.findOne(
            orgId,
            input.snapshotId as string,
          );
          return { content: JSON.stringify(snapshot) };
        },
      },
      {
        name: 'snapshot_delete',
        description: 'Delete a snapshot and its Docker image.',
        inputSchema: {
          type: 'object',
          properties: {
            snapshotId: {
              type: 'string',
              description: 'Snapshot ID',
            },
          },
          required: ['snapshotId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const snapshot = await this.imagesService.remove(
            orgId,
            input.snapshotId as string,
          );
          return {
            content: JSON.stringify({
              message: `Snapshot "${snapshot.name}" deleted.`,
            }),
          };
        },
      },
    ];
  }
}
