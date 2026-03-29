import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DockerService } from './docker.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DockerService],
  exports: [DockerService],
})
export class DockerModule {}
