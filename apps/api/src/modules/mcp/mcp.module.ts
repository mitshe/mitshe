import { Global, Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { SessionTools } from './tools/session.tools';
import { WorkflowTools } from './tools/workflow.tools';
import { TaskTools } from './tools/task.tools';
import { RepositoryTools } from './tools/repository.tools';
import { IntegrationTools } from './tools/integration.tools';
import { SnapshotTools } from './tools/snapshot.tools';
import { SkillTools } from './tools/skill.tools';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TasksModule } from '../tasks/tasks.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ImagesModule } from '../images/images.module';
import { SkillsModule } from '../skills/skills.module';

@Global()
@Module({
  imports: [
    WorkflowsModule,
    TasksModule,
    RepositoriesModule,
    IntegrationsModule,
    ImagesModule,
    SkillsModule,
  ],
  providers: [
    McpService,
    SessionTools,
    WorkflowTools,
    TaskTools,
    RepositoryTools,
    IntegrationTools,
    SnapshotTools,
    SkillTools,
  ],
  exports: [McpService],
})
export class McpModule {}
