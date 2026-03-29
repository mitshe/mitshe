import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        organizationId,
        name: dto.name,
        key: dto.key,
        description: dto.description,
        repoUrl: dto.repoUrl,
        repoBranch: dto.repoBranch ?? 'main',
        gitProviderType: dto.gitProviderType,
        gitProviderId: dto.gitProviderId,
        issueTrackerType: dto.issueTrackerType,
        issueTrackerProject: dto.issueTrackerProject,
        issueTrackerConfig: dto.issueTrackerConfig as Prisma.InputJsonValue,
        aiTriggerLabel: dto.aiTriggerLabel ?? 'AI',
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
            workflows: true,
          },
        },
      },
    });
  }

  async findOne(organizationId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async update(organizationId: string, id: string, dto: UpdateProjectDto) {
    // Verify project exists and belongs to organization
    await this.findOne(organizationId, id);

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        key: dto.key,
        description: dto.description,
        repoUrl: dto.repoUrl,
        repoBranch: dto.repoBranch,
        gitProviderType: dto.gitProviderType,
        gitProviderId: dto.gitProviderId,
        issueTrackerType: dto.issueTrackerType,
        issueTrackerProject: dto.issueTrackerProject,
        issueTrackerConfig: dto.issueTrackerConfig as Prisma.InputJsonValue,
        aiTriggerLabel: dto.aiTriggerLabel,
        isActive: dto.isActive,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    // Verify project exists and belongs to organization
    await this.findOne(organizationId, id);

    return this.prisma.project.delete({
      where: { id },
    });
  }

  async findByIssueTracker(
    organizationId: string,
    issueTrackerType: string,
    issueTrackerProject: string,
  ) {
    return this.prisma.project.findFirst({
      where: {
        organizationId,
        issueTrackerType,
        issueTrackerProject,
        isActive: true,
      },
    });
  }
}
