import { Global, Module } from '@nestjs/common';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsService } from './services/sessions.service';
import { SessionContainerService } from './services/session-container.service';
import { TerminalManagerService } from './services/terminal-manager.service';

@Global()
@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SessionContainerService, TerminalManagerService],
  exports: [SessionsService, SessionContainerService, TerminalManagerService],
})
export class SessionsModule {}
