import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TasksService } from '../../tasks/services/tasks.service';
import { McpTool, McpToolResult } from '../mcp.types';

@Injectable()
export class TaskTools {
  constructor(private readonly tasksService: TasksService) {}

  getTools(): McpTool[] {
    return [
      {
        name: 'task_list',
        description:
          'List tasks. Can filter by status, projectId, priority, and assignee.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Filter by project ID' },
            status: {
              type: 'string',
              description: 'Filter by status (e.g. OPEN, IN_PROGRESS, DONE)',
            },
            page: { type: 'string', description: 'Page number (default: 1)' },
            limit: {
              type: 'string',
              description: 'Items per page (default: 20)',
            },
          },
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const result = await this.tasksService.findAll(orgId, {
            projectId: input.projectId as string,
            status: input.status as TaskStatus | undefined,
            page: input.page ? parseInt(input.page as string, 10) : undefined,
            limit: input.limit
              ? parseInt(input.limit as string, 10)
              : undefined,
          });
          return { content: JSON.stringify(result) };
        },
      },
      {
        name: 'task_get',
        description: 'Get details of a specific task.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID' },
          },
          required: ['taskId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const task = await this.tasksService.findOne(
            orgId,
            input.taskId as string,
          );
          return { content: JSON.stringify(task) };
        },
      },
      {
        name: 'task_create',
        description: 'Create a new task.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            projectId: { type: 'string', description: 'Project ID' },
            priority: {
              type: 'string',
              description: 'Priority (LOW, MEDIUM, HIGH, CRITICAL)',
            },
          },
          required: ['title'],
        },
        execute: async (orgId, userId, input): Promise<McpToolResult> => {
          const task = await this.tasksService.create(orgId, userId, {
            title: input.title as string,
            description: input.description as string,
            projectId: input.projectId as string,
            priority: input.priority as string,
          } as any);
          return {
            content: JSON.stringify({
              id: task.id,
              title: (task as any).title,
              status: (task as any).status,
              message: `Task created.`,
            }),
          };
        },
      },
      {
        name: 'task_update',
        description: 'Update a task.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            status: {
              type: 'string',
              description: 'New status',
              enum: [
                'PENDING',
                'ANALYZING',
                'IN_PROGRESS',
                'REVIEW',
                'COMPLETED',
                'FAILED',
                'CANCELLED',
              ],
            },
            priority: { type: 'string', description: 'New priority' },
          },
          required: ['taskId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const { taskId, ...updateData } = input;
          const task = await this.tasksService.update(
            orgId,
            taskId as string,
            updateData as any,
          );
          return {
            content: JSON.stringify({
              id: task.id,
              message: 'Task updated.',
            }),
          };
        },
      },
      {
        name: 'task_delete',
        description: 'Delete a task.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID' },
          },
          required: ['taskId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          await this.tasksService.remove(orgId, input.taskId as string);
          return { content: JSON.stringify({ message: 'Task deleted.' }) };
        },
      },
      {
        name: 'task_process',
        description: 'Start AI processing on a task (analyze and automate).',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID' },
          },
          required: ['taskId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const task = await this.tasksService.startProcessing(
            orgId,
            input.taskId as string,
          );
          return {
            content: JSON.stringify({
              id: task.id,
              status: (task as any).status,
              message: 'Task processing started.',
            }),
          };
        },
      },
    ];
  }
}
