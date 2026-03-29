import { Module } from '@nestjs/common';
import { AICredentialsController } from './controllers/ai-credentials.controller';
import { AICredentialsService } from './services/ai-credentials.service';

@Module({
  controllers: [AICredentialsController],
  providers: [AICredentialsService],
  exports: [AICredentialsService],
})
export class AICredentialsModule {}
