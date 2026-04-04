import { Global, Module } from '@nestjs/common';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsService } from './services/sessions.service';
import { SessionContainerService } from './services/session-container.service';

@Global()
@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SessionContainerService],
  exports: [SessionsService, SessionContainerService],
})
export class SessionsModule {}
