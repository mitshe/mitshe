import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppService } from './app.service';
import { DockerService } from './infrastructure/docker/docker.service';

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
) as { version: string };

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dockerService: DockerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Welcome endpoint' })
  @ApiResponse({ status: 200, description: 'Welcome message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiTags('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    let dockerStatus: 'connected' | 'unavailable' = 'unavailable';
    try {
      const reachable = await this.dockerService.isDockerAvailable();
      dockerStatus = reachable ? 'connected' : 'unavailable';
    } catch {
      dockerStatus = 'unavailable';
    }

    return {
      status: 'ok',
      version: pkg.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      docker: dockerStatus,
    };
  }
}
