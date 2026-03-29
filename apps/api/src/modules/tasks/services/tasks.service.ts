import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from '../dto/task.dto';
import { TaskStatus, Prisma } from '@prisma/client';
import {
  PaginatedResponse,
  calculatePaginationOffset,
  createPaginatedResponse,
} from '../../../shared/pagination/pagination.dto';
import {
  TaskCreatedEvent,
  TaskStatusChangedEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
} from '../../../domain/events/task.events';
import {
  QUEUES,
  TaskProcessingJob,
} from '../../../infrastructure/queue/queues';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    @InjectQueue(QUEUES.TASK_PROCESSING)
    private readonly taskQueue: Queue<TaskProcessingJob>,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateTaskDto) {
    // Verify project belongs to organization
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    const task = await this.prisma.task.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        externalIssueId: dto.externalIssueId,
        externalIssueUrl: dto.externalIssueUrl,
        createdBy: userId,
        agentLogs: [],
      },
    });

    // Emit event
    this.eventBus.publish(
      new TaskCreatedEvent(
        task.id,
        organizationId,
        task.projectId,
        task.title,
        task.externalIssueId,
      ),
    );

    return task;
  }

  async findAll(
    organizationId: string,
    filter?: TaskFilterDto,
  ): Promise<PaginatedResponse<any>> {
    const where: Prisma.TaskWhereInput = { organizationId };
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.projectId) {
      where.projectId = filter.projectId;
    }
    if (filter?.externalIssueId) {
      where.externalIssueId = filter.externalIssueId;
    }

    // Get total count and paginated data in parallel
    const [total, data] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: calculatePaginationOffset(page, limit),
        take: limit,
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async update(organizationId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.findOne(organizationId, id);
    const previousStatus = task.status;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        projectId: dto.projectId,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        result: dto.result as Prisma.InputJsonValue,
      },
    });

    // Emit status change event
    if (dto.status && dto.status !== previousStatus) {
      this.eventBus.publish(
        new TaskStatusChangedEvent(
          id,
          organizationId,
          previousStatus,
          dto.status,
        ),
      );
    }

    return updated;
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.task.delete({ where: { id } });
  }

  // =========================================================================
  // Task Processing Methods
  // =========================================================================

  async startProcessing(organizationId: string, id: string) {
    // Use transaction to prevent race condition between status check and update
    const updated = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id, organizationId },
        include: { project: true },
      });

      if (!task) {
        throw new NotFoundException(`Task ${id} not found`);
      }

      if (task.status !== TaskStatus.PENDING) {
        throw new BadRequestException(`Task ${id} is not in PENDING status`);
      }

      return tx.task.update({
        where: { id },
        data: { status: TaskStatus.ANALYZING },
      });
    });

    // Emit status change event
    this.eventBus.publish(
      new TaskStatusChangedEvent(
        id,
        organizationId,
        TaskStatus.PENDING,
        TaskStatus.ANALYZING,
      ),
    );

    // Enqueue task for AI processing
    await this.taskQueue.add(
      'analyze',
      {
        type: 'analyze',
        taskId: id,
        organizationId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Task ${id} enqueued for AI processing`);

    return updated;
  }

  async cancel(organizationId: string, id: string) {
    const cancellableStatuses: TaskStatus[] = [
      TaskStatus.PENDING,
      TaskStatus.ANALYZING,
      TaskStatus.IN_PROGRESS,
    ];

    // Use transaction to prevent race condition between status check and update
    const { updated, previousStatus } = await this.prisma.$transaction(
      async (tx) => {
        const task = await tx.task.findFirst({
          where: { id, organizationId },
        });

        if (!task) {
          throw new NotFoundException(`Task ${id} not found`);
        }

        if (!cancellableStatuses.includes(task.status)) {
          throw new BadRequestException(
            `Task ${id} cannot be cancelled in status ${task.status}`,
          );
        }

        const result = await tx.task.update({
          where: { id },
          data: { status: TaskStatus.CANCELLED },
        });

        return { updated: result, previousStatus: task.status };
      },
    );

    this.eventBus.publish(
      new TaskStatusChangedEvent(
        id,
        organizationId,
        previousStatus,
        TaskStatus.CANCELLED,
      ),
    );

    return updated;
  }

  async complete(
    organizationId: string,
    id: string,
    result: Record<string, unknown>,
  ) {
    // Use transaction to ensure atomic read-check-update
    const updated = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id, organizationId },
      });

      if (!task) {
        throw new NotFoundException(`Task ${id} not found`);
      }

      return tx.task.update({
        where: { id },
        data: {
          status: TaskStatus.COMPLETED,
          result: result as Prisma.InputJsonValue,
        },
      });
    });

    this.eventBus.publish(
      new TaskCompletedEvent(id, organizationId, result as any),
    );

    return updated;
  }

  async fail(organizationId: string, id: string, reason: string) {
    // Use transaction to ensure atomic read-check-update
    const updated = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id, organizationId },
      });

      if (!task) {
        throw new NotFoundException(`Task ${id} not found`);
      }

      return tx.task.update({
        where: { id },
        data: {
          status: TaskStatus.FAILED,
          result: {
            type: 'manual_intervention',
            reason,
          } as Prisma.InputJsonValue,
        },
      });
    });

    this.eventBus.publish(new TaskFailedEvent(id, organizationId, reason));

    return updated;
  }

  async addAgentLog(
    organizationId: string,
    id: string,
    log: {
      agentName: string;
      action: string;
      details?: Record<string, unknown>;
    },
  ) {
    // Use transaction to prevent lost writes when concurrent requests append logs
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id, organizationId },
      });

      if (!task) {
        throw new NotFoundException(`Task ${id} not found`);
      }

      const currentLogs = (task.agentLogs as any[]) || [];

      return tx.task.update({
        where: { id },
        data: {
          agentLogs: [
            ...currentLogs,
            { ...log, timestamp: new Date().toISOString() },
          ] as Prisma.InputJsonValue,
        },
      });
    });
  }
}
