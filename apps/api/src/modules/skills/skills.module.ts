import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { SkillsController } from './controllers/skills.controller';
import { SkillsService } from './services/skills.service';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { SYSTEM_SKILLS } from './system-skills';

@Module({
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule implements OnModuleInit {
  private readonly logger = new Logger(SkillsModule.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedSystemSkills();
  }

  private async seedSystemSkills() {
    for (const skill of SYSTEM_SKILLS) {
      await this.prisma.skill.upsert({
        where: { id: skill.id },
        update: {
          name: skill.name,
          description: skill.description,
          category: skill.category,
          instructions: skill.instructions,
        },
        create: {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          instructions: skill.instructions,
          isSystem: true,
        },
      });
    }

    this.logger.log(`Seeded ${SYSTEM_SKILLS.length} system skills`);
  }
}
