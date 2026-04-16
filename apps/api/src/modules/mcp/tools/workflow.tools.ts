import { Injectable } from '@nestjs/common';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { WorkflowOrchestratorService } from '../../workflows/engine/workflow-orchestrator.service';
import { McpTool, McpToolResult } from '../mcp.types';

@Injectable()
export class WorkflowTools {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly orchestratorService: WorkflowOrchestratorService,
  ) {}

  getTools(): McpTool[] {
    return [
      {
        name: 'workflow_list',
        description:
          'List all workflows. Can filter by projectId and active status.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Filter by project ID' },
            isActive: {
              type: 'string',
              description: 'Filter by active status (true/false)',
            },
          },
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const result = await this.workflowsService.findAll(orgId, {
            projectId: input.projectId as string,
            isActive:
              input.isActive !== undefined
                ? input.isActive === 'true'
                : undefined,
          });
          return { content: JSON.stringify(result) };
        },
      },
      {
        name: 'workflow_get',
        description:
          'Get details of a specific workflow including its node/edge definition.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
          },
          required: ['workflowId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const workflow = await this.workflowsService.findOne(
            orgId,
            input.workflowId as string,
          );
          return { content: JSON.stringify(workflow) };
        },
      },
      {
        name: 'workflow_create',
        description:
          'Create a new workflow. Provide a name and optionally a full definition with nodes and edges, or create from a template.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Workflow name' },
            description: { type: 'string', description: 'Workflow description' },
            projectId: { type: 'string', description: 'Project ID' },
            triggerType: {
              type: 'string',
              description:
                'Trigger type (manual, schedule, webhook, jira, git, etc.)',
            },
            definition: {
              type: 'string',
              description:
                'Workflow definition as JSON string: { "version": "1.0", "nodes": [...], "edges": [...] }',
            },
          },
          required: ['name'],
        },
        execute: async (orgId, userId, input): Promise<McpToolResult> => {
          let definition;
          if (input.definition) {
            try {
              definition = JSON.parse(input.definition as string);
            } catch {
              return {
                content: 'Invalid JSON in definition field.',
                isError: true,
              };
            }
          }

          const workflow = await this.workflowsService.create(orgId, userId, {
            name: input.name as string,
            description: input.description as string,
            projectId: input.projectId as string,
            triggerType: input.triggerType as string,
            definition,
          });

          return {
            content: JSON.stringify({
              id: workflow.id,
              name: workflow.name,
              message: `Workflow "${workflow.name}" created.`,
            }),
          };
        },
      },
      {
        name: 'workflow_create_from_template',
        description:
          'Create a workflow from a predefined template. Use workflow_list_templates to see available templates.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: { type: 'string', description: 'Template ID' },
            name: { type: 'string', description: 'Workflow name' },
            description: { type: 'string', description: 'Description' },
            projectId: { type: 'string', description: 'Project ID' },
          },
          required: ['templateId', 'name'],
        },
        execute: async (orgId, userId, input): Promise<McpToolResult> => {
          const workflow = await this.workflowsService.createFromTemplate(
            orgId,
            userId,
            {
              templateId: input.templateId as string,
              name: input.name as string,
              description: input.description as string,
              projectId: input.projectId as string,
            },
          );
          return {
            content: JSON.stringify({
              id: workflow.id,
              name: workflow.name,
              message: `Workflow "${workflow.name}" created from template.`,
            }),
          };
        },
      },
      {
        name: 'workflow_list_templates',
        description: 'List available workflow templates.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<McpToolResult> => {
          const templates = this.workflowsService.getTemplates();
          return { content: JSON.stringify(templates) };
        },
      },
      {
        name: 'workflow_update',
        description: 'Update a workflow name, description, or definition.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
            name: { type: 'string', description: 'New name' },
            description: { type: 'string', description: 'New description' },
            definition: {
              type: 'string',
              description: 'New definition as JSON string',
            },
          },
          required: ['workflowId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          let definition;
          if (input.definition) {
            try {
              definition = JSON.parse(input.definition as string);
            } catch {
              return {
                content: 'Invalid JSON in definition field.',
                isError: true,
              };
            }
          }

          const workflow = await this.workflowsService.update(
            orgId,
            input.workflowId as string,
            {
              name: input.name as string,
              description: input.description as string,
              definition,
            },
          );
          return {
            content: JSON.stringify({
              id: workflow.id,
              name: workflow.name,
              message: `Workflow "${workflow.name}" updated.`,
            }),
          };
        },
      },
      {
        name: 'workflow_delete',
        description: 'Delete a workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
          },
          required: ['workflowId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          await this.workflowsService.remove(
            orgId,
            input.workflowId as string,
          );
          return {
            content: JSON.stringify({ message: 'Workflow deleted.' }),
          };
        },
      },
      {
        name: 'workflow_run',
        description: 'Manually run a workflow. Optionally pass trigger data.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
            triggerData: {
              type: 'string',
              description: 'Trigger data as JSON string',
            },
          },
          required: ['workflowId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          let triggerData = {};
          if (input.triggerData) {
            try {
              triggerData = JSON.parse(input.triggerData as string);
            } catch {
              return {
                content: 'Invalid JSON in triggerData.',
                isError: true,
              };
            }
          }

          const executionId = await this.orchestratorService.startExecution(
            orgId,
            input.workflowId as string,
            triggerData,
          );

          return {
            content: JSON.stringify({
              executionId,
              message: `Workflow started. Execution ID: ${executionId}`,
            }),
          };
        },
      },
      {
        name: 'workflow_activate',
        description: 'Activate a workflow (enable its trigger).',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
          },
          required: ['workflowId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const workflow = await this.workflowsService.activate(
            orgId,
            input.workflowId as string,
          );
          return {
            content: JSON.stringify({
              message: `Workflow "${workflow.name}" activated.`,
            }),
          };
        },
      },
      {
        name: 'workflow_deactivate',
        description: 'Deactivate a workflow (disable its trigger).',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
          },
          required: ['workflowId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const workflow = await this.workflowsService.deactivate(
            orgId,
            input.workflowId as string,
          );
          return {
            content: JSON.stringify({
              message: `Workflow "${workflow.name}" deactivated.`,
            }),
          };
        },
      },
      {
        name: 'workflow_execution_get',
        description: 'Get execution details including node-level results.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
            executionId: { type: 'string', description: 'Execution ID' },
          },
          required: ['workflowId', 'executionId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const details = await this.workflowsService.getExecutionDetails(
            orgId,
            input.workflowId as string,
            input.executionId as string,
          );
          return { content: JSON.stringify(details) };
        },
      },
    ];
  }
}
