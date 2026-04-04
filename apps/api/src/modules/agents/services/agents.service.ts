import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import {
  CreateAgentDefinitionDto,
  UpdateAgentDefinitionDto,
} from '../dto/agent.dto';

const INCLUDE_RELATIONS = {
  aiCredential: { select: { id: true, provider: true } },
  defaultProject: { select: { id: true, name: true, key: true } },
  defaultRepositories: {
    include: {
      repository: {
        select: { id: true, name: true, fullPath: true },
      },
    },
  },
};

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateAgentDefinitionDto,
  ) {
    return this.prisma.agentDefinition.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description || null,
        aiCredentialId: dto.aiCredentialId || null,
        startArguments: dto.startArguments || null,
        instructions: dto.instructions || '',
        maxSessionDurationMs: dto.maxSessionDurationMs || null,
        defaultProjectId: dto.defaultProjectId || null,
        createdBy: userId,
        defaultRepositories: dto.defaultRepositoryIds
          ? {
              create: dto.defaultRepositoryIds.map((repositoryId) => ({
                repositoryId,
              })),
            }
          : undefined,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.agentDefinition.findMany({
      where: { organizationId },
      include: INCLUDE_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const agent = await this.prisma.agentDefinition.findFirst({
      where: { id, organizationId },
      include: INCLUDE_RELATIONS,
    });

    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }

    return agent;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateAgentDefinitionDto,
  ) {
    await this.findOne(organizationId, id);

    // Handle repository updates
    if (dto.defaultRepositoryIds !== undefined) {
      await this.prisma.agentDefinitionRepository.deleteMany({
        where: { agentDefinitionId: id },
      });

      if (dto.defaultRepositoryIds.length > 0) {
        await this.prisma.agentDefinitionRepository.createMany({
          data: dto.defaultRepositoryIds.map((repositoryId) => ({
            agentDefinitionId: id,
            repositoryId,
          })),
        });
      }
    }

    return this.prisma.agentDefinition.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && {
          description: dto.description || null,
        }),
        ...(dto.aiCredentialId !== undefined && {
          aiCredentialId: dto.aiCredentialId || null,
        }),
        ...(dto.startArguments !== undefined && {
          startArguments: dto.startArguments || null,
        }),
        ...(dto.instructions !== undefined && {
          instructions: dto.instructions || '',
        }),
        ...(dto.maxSessionDurationMs !== undefined && {
          maxSessionDurationMs: dto.maxSessionDurationMs || null,
        }),
        ...(dto.defaultProjectId !== undefined && {
          defaultProjectId: dto.defaultProjectId || null,
        }),
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.agentDefinition.delete({ where: { id } });
  }
}
