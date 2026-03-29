import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';

import { EventHandlers } from './events/handlers';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';
import { AdaptersModule } from '../infrastructure/adapters/adapters.module';
import { QUEUES } from '../infrastructure/queue/queues';

/**
 * Application Layer Module
 *
 * Contains CQRS handlers for:
 * - Commands (write operations)
 * - Queries (read operations)
 * - Events (side effects)
 */
@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    AdaptersModule,
    BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS }),
  ],
  providers: [...EventHandlers],
  exports: [...EventHandlers],
})
export class ApplicationModule {}
