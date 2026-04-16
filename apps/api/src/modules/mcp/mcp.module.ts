import { Global, Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { SessionTools } from './tools/session.tools';
import { WorkflowTools } from './tools/workflow.tools';
import { TaskTools } from './tools/task.tools';
import { RepositoryTools } from './tools/repository.tools';
import { IntegrationTools } from './tools/integration.tools';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TasksModule } from '../tasks/tasks.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Global()
@Module({
  imports: [
    WorkflowsModule,
    TasksModule,
    RepositoriesModule,
    IntegrationsModule,
  ],
  providers: [
    McpService,
    SessionTools,
    WorkflowTools,
    TaskTools,
    RepositoryTools,
    IntegrationTools,
  ],
  exports: [McpService],
})
export class McpModule {}
