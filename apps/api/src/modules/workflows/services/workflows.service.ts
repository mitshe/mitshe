import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowDefinitionDto,
  CreateFromTemplateDto,
  WorkflowFilterDto,
  ExecutionFilterDto,
} from '../dto/workflow.dto';
import { Prisma } from '@prisma/client';
import { WORKFLOW_TEMPLATES, WorkflowTemplateId } from '../templates';
import {
  PaginatedResponse,
  calculatePaginationOffset,
  createPaginatedResponse,
} from '../../../shared/pagination/pagination.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateWorkflowDto) {
    // Validate workflow definition if provided
    if (dto.definition) {
      this.validateDefinition(dto.definition);
    }

    // Default empty definition if not provided
    const definition = dto.definition || {
      version: '1.0',
      nodes: [],
      edges: [],
    };

    return this.prisma.workflow.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType || 'manual',
        triggerConfig: dto.triggerConfig as Prisma.InputJsonValue,
        definition: definition as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  async findAll(
    organizationId: string,
    filter?: WorkflowFilterDto,
  ): Promise<PaginatedResponse<any>> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;

    const where: Prisma.WorkflowWhereInput = {
      organizationId,
      ...(filter?.projectId && { projectId: filter.projectId }),
      ...(filter?.isActive !== undefined && { isActive: filter.isActive }),
    };

    const select = {
      id: true,
      name: true,
      description: true,
      projectId: true,
      triggerType: true,
      isActive: true,
      version: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { executions: true },
      },
    };

    // Get total count and paginated data in parallel
    const [total, data] = await Promise.all([
      this.prisma.workflow.count({ where }),
      this.prisma.workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: calculatePaginationOffset(page, limit),
        take: limit,
        select,
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    return workflow;
  }

  async update(organizationId: string, id: string, dto: UpdateWorkflowDto) {
    if (dto.definition) {
      this.validateDefinition(dto.definition);
    }

    // Use transaction to prevent race condition on version increment
    // Multiple concurrent updates could read the same version and increment to the same value
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.findFirst({
        where: { id, organizationId },
      });

      if (!workflow) {
        throw new NotFoundException(`Workflow ${id} not found`);
      }

      // Increment version if definition changed
      const newVersion = dto.definition
        ? workflow.version + 1
        : workflow.version;

      // Extract trigger type from first trigger node in definition
      let triggerType = workflow.triggerType;
      if (dto.definition) {
        const firstTrigger = dto.definition.nodes.find((n) =>
          n.type.startsWith('trigger:'),
        );
        if (firstTrigger) {
          // Convert trigger:manual -> manual, trigger:jira_component_added -> jira_component_added
          triggerType = firstTrigger.type.replace('trigger:', '');
        }
      }

      return tx.workflow.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          definition: dto.definition as unknown as Prisma.InputJsonValue,
          triggerType,
          version: newVersion,
        },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.workflow.delete({ where: { id } });
  }

  async activate(organizationId: string, id: string) {
    const workflow = await this.findOne(organizationId, id);

    if (workflow.isActive) {
      throw new BadRequestException('Workflow is already active');
    }

    // Validate before activating
    this.validateDefinition(
      workflow.definition as unknown as WorkflowDefinitionDto,
    );

    return this.prisma.workflow.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(organizationId: string, id: string) {
    const workflow = await this.findOne(organizationId, id);

    if (!workflow.isActive) {
      throw new BadRequestException('Workflow is already inactive');
    }

    return this.prisma.workflow.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // =========================================================================
  // Execution Methods
  // =========================================================================

  async getExecutions(
    organizationId: string,
    workflowId: string,
    filter?: ExecutionFilterDto,
  ): Promise<PaginatedResponse<any>> {
    await this.findOne(organizationId, workflowId);

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 50;

    const where = { workflowId };

    // Get total count and paginated data in parallel
    const [total, data] = await Promise.all([
      this.prisma.workflowExecution.count({ where }),
      this.prisma.workflowExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: calculatePaginationOffset(page, limit),
        take: limit,
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getExecution(
    organizationId: string,
    workflowId: string,
    executionId: string,
  ) {
    await this.findOne(organizationId, workflowId);

    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, workflowId },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    return execution;
  }

  /**
   * Get detailed execution information including node results
   * Uses the new nodeExecutions table for atomic, race-condition-free updates
   */
  async getExecutionDetails(
    organizationId: string,
    workflowId: string,
    executionId: string,
  ): Promise<{
    execution: any;
    nodeExecutions: Array<{
      nodeId: string;
      nodeName: string | null;
      nodeType: string | null;
      status: string;
      output: unknown;
      error: string | null;
      startedAt: Date | null;
      completedAt: Date | null;
      durationMs: number | null;
    }>;
  }> {
    // Verify workflow belongs to organization
    await this.findOne(organizationId, workflowId);

    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId,
        // Double-check organization ownership for security
        workflow: {
          organizationId,
        },
      },
      include: {
        workflow: {
          select: { name: true, definition: true },
        },
        // Include node executions from new table (atomic updates, no race conditions)
        nodeExecutions: {
          orderBy: { startedAt: 'asc' },
          select: {
            nodeId: true,
            nodeName: true,
            nodeType: true,
            status: true,
            output: true,
            error: true,
            startedAt: true,
            completedAt: true,
            durationMs: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    return {
      execution,
      nodeExecutions: execution.nodeExecutions,
    };
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private validateDefinition(definition: WorkflowDefinitionDto): void {
    const errors: string[] = [];

    // Must have at least one trigger
    const triggers = definition.nodes.filter((n) =>
      n.type.startsWith('trigger:'),
    );
    if (triggers.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // All edges must reference existing nodes
    const nodeIds = new Set(definition.nodes.map((n) => n.id));
    for (const edge of definition.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }

    // Check for duplicate node IDs
    const seenIds = new Set<string>();
    for (const node of definition.nodes) {
      if (seenIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      seenIds.add(node.id);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid workflow definition',
        errors,
      });
    }
  }

  async findActiveByTrigger(
    organizationId: string,
    triggerType: string,
    config?: Record<string, unknown>,
  ) {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Filter workflows that have matching trigger
    return workflows.filter((workflow) => {
      const definition =
        workflow.definition as unknown as WorkflowDefinitionDto;
      return definition.nodes.some(
        (node) =>
          node.type === triggerType &&
          (!config || this.matchesConfig(node.config, config)),
      );
    });
  }

  private matchesConfig(
    nodeConfig: Record<string, unknown>,
    triggerConfig: Record<string, unknown>,
  ): boolean {
    // Simple matching - can be extended for complex filters
    for (const [key, value] of Object.entries(triggerConfig)) {
      if (nodeConfig[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // =========================================================================
  // Template Methods
  // =========================================================================

  getTemplates() {
    return Object.entries(WORKFLOW_TEMPLATES).map(([id, template]) => ({
      id,
      ...template.metadata,
    }));
  }

  getTemplate(templateId: string) {
    const template = WORKFLOW_TEMPLATES[templateId as WorkflowTemplateId];

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return {
      id: templateId,
      ...template.metadata,
      workflow: template.workflow,
    };
  }

  async createFromTemplate(
    organizationId: string,
    userId: string,
    dto: CreateFromTemplateDto,
  ) {
    const template = WORKFLOW_TEMPLATES[dto.templateId as WorkflowTemplateId];

    if (!template) {
      throw new NotFoundException(`Template ${dto.templateId} not found`);
    }

    // Deep clone the template workflow
    const definition = JSON.parse(
      JSON.stringify(template.workflow),
    ) as WorkflowDefinitionDto;

    // Override variables if provided
    if (dto.variables) {
      definition.variables = {
        ...definition.variables,
        ...dto.variables,
      };
    }

    // Validate the definition
    this.validateDefinition(definition);

    // Extract trigger type from first trigger node
    const firstTrigger = definition.nodes.find((n) =>
      n.type.startsWith('trigger:'),
    );
    const triggerType = firstTrigger
      ? firstTrigger.type.replace('trigger:', '')
      : 'manual';

    // Create the workflow
    return this.prisma.workflow.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        name: dto.name || template.metadata.name,
        description: dto.description || template.metadata.description,
        triggerType,
        definition: definition as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }
}
