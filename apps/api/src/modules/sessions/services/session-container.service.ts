import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

export interface SessionContainerConfig {
  sessionId: string;
  organizationId: string;
  repos: Array<{ name: string; cloneUrl: string; branch: string }>;
  instructions: string;
  anthropicApiKey?: string;
}

export interface ClaudeEvent {
  type: string;
  [key: string]: unknown;
}

@Injectable()
export class SessionContainerService implements OnModuleInit {
  private readonly logger = new Logger(SessionContainerService.name);
  private docker: Docker;
  private readonly executorImage: string;
  private readonly containerPrefix = 'mitshe-session';

  constructor(private configService: ConfigService) {
    this.docker = new Docker();
    this.executorImage =
      this.configService.get<string>('EXECUTOR_IMAGE') ||
      'ghcr.io/mitshe/mitshe-executor:latest';
  }

  async onModuleInit() {
    await this.cleanupStaleContainers();
  }

  /**
   * Create and start a session container
   */
  async createAndStart(config: SessionContainerConfig): Promise<string> {
    const containerName = `${this.containerPrefix}-${config.sessionId}`;

    const sessionConfig = Buffer.from(
      JSON.stringify({
        repos: config.repos,
        instructions: config.instructions,
      }),
    ).toString('base64');

    const env = [`SESSION_CONFIG=${sessionConfig}`];
    if (config.anthropicApiKey) {
      env.push(`ANTHROPIC_API_KEY=${config.anthropicApiKey}`);
    }

    this.logger.log(`Creating session container: ${containerName}`);

    const container = await this.docker.createContainer({
      Image: this.executorImage,
      name: containerName,
      Entrypoint: ['node', '/session/server.js'],
      Env: env,
      WorkingDir: '/workspace',
      Labels: {
        'mitshe.type': 'session',
        'mitshe.session-id': config.sessionId,
        'mitshe.organization-id': config.organizationId,
        'mitshe.created-at': new Date().toISOString(),
      },
      HostConfig: {
        Memory: 4 * 1024 * 1024 * 1024, // 4GB
        NanoCpus: 2 * 1e9, // 2 CPUs
        PidsLimit: 512,
        NetworkMode: 'bridge',
        SecurityOpt: ['no-new-privileges:true'],
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
      },
    });

    await container.start();

    const containerId = container.id;
    this.logger.log(
      `Session container started: ${containerName} (${containerId.slice(0, 12)})`,
    );

    return containerId;
  }

  /**
   * Execute a Claude Code message in the container and stream events
   */
  async execClaudeMessage(
    containerId: string,
    message: string,
    onEvent: (event: ClaudeEvent) => void,
  ): Promise<{ exitCode: number }> {
    const container = this.docker.getContainer(containerId);

    // Escape message for shell
    const escapedMessage = message.replace(/'/g, "'\\''");

    const exec = await container.exec({
      Cmd: [
        'bash',
        '-c',
        `cd /workspace && claude -p '${escapedMessage}' --continue --output-format stream-json --verbose 2>&1`,
      ],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/workspace',
    });

    return new Promise((resolve) => {
      exec.start({ hijack: true, stdin: false }, (err, stream) => {
        if (err || !stream) {
          this.logger.error(
            `Exec start failed: ${err?.message || 'no stream'}`,
          );
          resolve({ exitCode: 1 });
          return;
        }

        let buffer = '';

        const processOutput = (data: Buffer) => {
          buffer += data.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line) as ClaudeEvent;
              onEvent(event);
            } catch {
              // Not JSON — emit as raw log
              onEvent({
                type: 'log',
                level: 'debug',
                message: line,
              });
            }
          }
        };

        // Demux Docker multiplexed stream (8-byte header + data)
        stream.on('data', (chunk: Buffer) => {
          let offset = 0;
          while (offset < chunk.length) {
            if (offset + 8 > chunk.length) {
              processOutput(chunk.slice(offset));
              break;
            }

            const type = chunk[offset];
            const size = chunk.readUInt32BE(offset + 4);

            if (offset + 8 + size > chunk.length) {
              processOutput(chunk.slice(offset));
              break;
            }

            const data = chunk.slice(offset + 8, offset + 8 + size);

            if (type === 1 || type === 2) {
              processOutput(data);
            }

            offset += 8 + size;
          }
        });

        stream.on('end', () => {
          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer) as ClaudeEvent;
              onEvent(event);
            } catch {
              // ignore
            }
          }

          exec
            .inspect()
            .then((info) => {
              resolve({ exitCode: info.ExitCode ?? 0 });
            })
            .catch(() => {
              resolve({ exitCode: 0 });
            });
        });

        stream.on('error', (streamErr) => {
          this.logger.error(`Exec stream error: ${streamErr.message}`);
          resolve({ exitCode: 1 });
        });
      });
    });
  }

  /**
   * Get file tree from workspace
   */
  async getFileTree(
    containerId: string,
    basePath = '/workspace',
  ): Promise<string[]> {
    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: [
        'find',
        basePath,
        '-type',
        'f',
        '-not',
        '-path',
        '*/node_modules/*',
        '-not',
        '-path',
        '*/.git/*',
        '-not',
        '-path',
        '*/.claude/*',
        '-maxdepth',
        '5',
      ],
      AttachStdout: true,
      AttachStderr: true,
    });

    return new Promise((resolve) => {
      exec.start({}, (err, stream) => {
        if (err || !stream) {
          resolve([]);
          return;
        }

        let output = '';
        stream.on('data', (chunk: Buffer) => {
          // Demux
          let offset = 0;
          while (offset < chunk.length) {
            if (offset + 8 > chunk.length) {
              output += chunk.slice(offset).toString('utf8');
              break;
            }
            const type = chunk[offset];
            const size = chunk.readUInt32BE(offset + 4);
            if (offset + 8 + size > chunk.length) {
              output += chunk.slice(offset).toString('utf8');
              break;
            }
            if (type === 1) {
              output += chunk.slice(offset + 8, offset + 8 + size).toString('utf8');
            }
            offset += 8 + size;
          }
        });

        stream.on('end', () => {
          const files = output
            .split('\n')
            .map((f) => f.trim())
            .filter(Boolean);
          resolve(files);
        });

        stream.on('error', () => resolve([]));
      });
    });
  }

  /**
   * Stop a container (SIGTERM with grace period)
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 5 });
      this.logger.log(`Container stopped: ${containerId.slice(0, 12)}`);
    } catch (err) {
      if (!(err as any).statusCode || (err as any).statusCode !== 304) {
        this.logger.warn(
          `Failed to stop container ${containerId.slice(0, 12)}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
      this.logger.log(`Container removed: ${containerId.slice(0, 12)}`);
    } catch (err) {
      this.logger.warn(
        `Failed to remove container ${containerId.slice(0, 12)}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Check if a container is running
   */
  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running === true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup stale session containers (older than 48h)
   */
  private async cleanupStaleContainers(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: ['mitshe.type=session'] },
      });

      const maxAge = 48 * 60 * 60 * 1000; // 48 hours
      const now = Date.now();

      for (const containerInfo of containers) {
        const createdAt = containerInfo.Labels['mitshe.created-at'];
        if (createdAt && now - new Date(createdAt).getTime() > maxAge) {
          this.logger.log(
            `Cleaning up stale session container: ${containerInfo.Names[0]}`,
          );
          await this.removeContainer(containerInfo.Id);
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to cleanup stale containers: ${(err as Error).message}`,
      );
    }
  }
}
