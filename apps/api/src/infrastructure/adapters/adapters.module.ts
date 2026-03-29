import { Global, Module } from '@nestjs/common';
import { AdapterFactoryService } from './adapter-factory.service';
import { PrismaModule } from '../persistence/prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';

@Global()
@Module({
  imports: [PrismaModule, SharedModule],
  providers: [AdapterFactoryService],
  exports: [AdapterFactoryService],
})
export class AdaptersModule {}
