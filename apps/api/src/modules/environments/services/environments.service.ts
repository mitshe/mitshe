import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from '../dto/environment.dto';

const INCLUDE_RELATIONS = {
  variables: true,
};

@Injectable()
export class EnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateEnvironmentDto,
  ) {
    return this.prisma.environment.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description || null,
        memoryMb: dto.memoryMb || null,
        cpuCores: dto.cpuCores || null,
        setupScript: dto.setupScript || null,
        createdBy: userId,
        variables: dto.variables
          ? {
              create: dto.variables.map((v) => ({
                key: v.key,
                value: v.value,
                isSecret: v.isSecret ?? false,
              })),
            }
          : undefined,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.environment.findMany({
      where: { organizationId },
      include: INCLUDE_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const env = await this.prisma.environment.findFirst({
      where: { id, organizationId },
      include: INCLUDE_RELATIONS,
    });

    if (!env) {
      throw new NotFoundException(`Environment ${id} not found`);
    }

    return env;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateEnvironmentDto,
  ) {
    await this.findOne(organizationId, id);

    // Replace variables if provided
    if (dto.variables !== undefined) {
      await this.prisma.environmentVariable.deleteMany({
        where: { environmentId: id },
      });

      if (dto.variables.length > 0) {
        await this.prisma.environmentVariable.createMany({
          data: dto.variables.map((v) => ({
            environmentId: id,
            key: v.key,
            value: v.value,
            isSecret: v.isSecret ?? false,
          })),
        });
      }
    }

    return this.prisma.environment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && {
          description: dto.description || null,
        }),
        ...(dto.memoryMb !== undefined && {
          memoryMb: dto.memoryMb || null,
        }),
        ...(dto.cpuCores !== undefined && {
          cpuCores: dto.cpuCores || null,
        }),
        ...(dto.setupScript !== undefined && {
          setupScript: dto.setupScript || null,
        }),
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.environment.delete({ where: { id } });
  }
}
