import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CreateSkillDto, UpdateSkillDto } from '../dto/skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateSkillDto) {
    return this.prisma.skill.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        instructions: dto.instructions,
        createdBy: userId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.skill.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const skill = await this.prisma.skill.findFirst({
      where: { id, organizationId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async update(organizationId: string, id: string, dto: UpdateSkillDto) {
    await this.findOne(organizationId, id);

    return this.prisma.skill.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.instructions && { instructions: dto.instructions }),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.skill.delete({ where: { id } });
  }

  async buildInstructions(
    organizationId: string,
    skillIds: string[],
  ): Promise<string> {
    if (skillIds.length === 0) return '';

    const skills = await this.prisma.skill.findMany({
      where: {
        id: { in: skillIds },
        organizationId,
      },
    });

    return skills
      .map((s) => `## Skill: ${s.name}\n\n${s.instructions}`)
      .join('\n\n---\n\n');
  }
}
