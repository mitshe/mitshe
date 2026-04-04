import { Module } from '@nestjs/common';
import { AgentsController } from './controllers/agents.controller';
import { AgentsService } from './services/agents.service';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
