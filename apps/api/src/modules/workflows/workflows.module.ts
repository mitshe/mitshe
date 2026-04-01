import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './controllers/workflows.controller';
import { WorkflowsService } from './services/workflows.service';
import { AdaptersModule } from '@/infrastructure/adapters/adapters.module';
import { DockerModule } from '@/infrastructure/docker/docker.module';
import { SharedModule } from '@/shared/shared.module';
import { QueueModule } from '@/infrastructure/queue/queue.module';

// New clean architecture services
import { WorkflowOrchestratorService } from './engine/workflow-orchestrator.service';
import { WorkflowExecutorService } from './engine/workflow-executor.service';
import { WorkflowPersistenceService } from './engine/workflow-persistence.service';
import { ExecutionEventEmitterService } from './engine/execution-event-emitter.service';
import { CredentialsLoaderService } from './engine/credentials-loader.service';
import { NodeEnricherService } from './engine/node-enricher.service';

@Module({
  imports: [
    AdaptersModule,
    DockerModule,
    SharedModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [WorkflowsController],
  providers: [
    // CRUD service
    WorkflowsService,

    // Engine services (clean architecture)
    WorkflowOrchestratorService,
    WorkflowExecutorService,
    WorkflowPersistenceService,
    ExecutionEventEmitterService,
    CredentialsLoaderService,
    NodeEnricherService,
  ],
  exports: [WorkflowsService, WorkflowOrchestratorService],
})
export class WorkflowsModule {}
