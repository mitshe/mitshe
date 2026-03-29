import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { TasksController } from './controllers/tasks.controller';
import { TasksService } from './services/tasks.service';
import { TaskImportService } from './services/task-import.service';
import { WorkflowsModule } from '../workflows/workflows.module';
import { AdaptersModule } from '@/infrastructure/adapters/adapters.module';
import { QUEUES } from '@/infrastructure/queue/queues';

@Module({
  imports: [
    CqrsModule,
    WorkflowsModule,
    AdaptersModule,
    BullModule.registerQueue({ name: QUEUES.TASK_PROCESSING }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskImportService],
  exports: [TasksService, TaskImportService],
})
export class TasksModule {}
