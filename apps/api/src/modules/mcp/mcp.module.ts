import { Global, Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { SessionTools } from './tools/session.tools';
import { WorkflowTools } from './tools/workflow.tools';
import { TaskTools } from './tools/task.tools';
import { RepositoryTools } from './tools/repository.tools';
import { IntegrationTools } from './tools/integration.tools';
import { SnapshotTools } from './tools/snapshot.tools';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TasksModule } from '../tasks/tasks.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ImagesModule } from '../images/images.module';

@Global()
@Module({
  imports: [
    WorkflowsModule,
    TasksModule,
    RepositoriesModule,
    IntegrationsModule,
    ImagesModule,
  ],
  providers: [
    McpService,
    SessionTools,
    WorkflowTools,
    TaskTools,
    RepositoryTools,
    IntegrationTools,
    SnapshotTools,
  ],
  exports: [McpService],
})
export class McpModule {}
