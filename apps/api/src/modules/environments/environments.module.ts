import { Module } from '@nestjs/common';
import { EnvironmentsController } from './controllers/environments.controller';
import { EnvironmentsService } from './services/environments.service';

@Module({
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
