import { Module } from '@nestjs/common';
import { IntegrationsController } from './controllers/integrations.controller';
import { IntegrationsService } from './services/integrations.service';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
