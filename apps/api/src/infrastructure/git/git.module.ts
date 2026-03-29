import { Module } from '@nestjs/common';
import { GitOperationsService } from './git-operations.service';
import { AdaptersModule } from '../adapters/adapters.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [AdaptersModule, SharedModule],
  providers: [GitOperationsService],
  exports: [GitOperationsService],
})
export class GitModule {}
