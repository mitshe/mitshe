import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { Readable } from 'stream';

/**
 * AI Provider types - must match Prisma enum
 */
export type AIProviderType =
  | 'claude'
  | 'openai'
  | 'openrouter'
  | 'gemini'
  | 'groq';

/**
 * AI Credentials for each provider
 */
export interface AICredentials {
  claude?: string;
  openai?: string;
  openrouter?: string;
  gemini?: string;
  groq?: string;
  defaultProvider?: AIProviderType;
}

/**
 * Git Provider types
 */
export type GitProviderType = 'github' | 'gitlab';

/**
 * Slack Credentials
 */
export interface SlackCredentials {
  botToken?: string;
  defaultChannel?: string;
  webhookUrl?: string; // Legacy fallback
}

/**
 * Discord Credentials
 */
export interface DiscordCredentials {
  webhookUrl: string;
}

/**
 * Telegram Credentials
 */
export interface TelegramCredentials {
  botToken: string;
  defaultChatId?: string;
}

/**
 * Workflow Job - passed to container via env var
 */
export interface WorkflowJobPayload {
  executionId: string;
  workflowId: string;
  organizationId: string;
  definition: {
    nodes: Array<{
      id: string;
      type: string;
      name: string;
      config: Record<string, unknown>;
      position?: { x: number; y: number };
      onError?: string;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      condition?: string;
    }>;
    variables?: Record<string, unknown>;
  };
  triggerData: Record<string, unknown>;
  credentials: {
    ai: AICredentials;
    git?: {
      token: string;
      provider: GitProviderType;
    };
    slack?: SlackCredentials;
    discord?: DiscordCredentials;
    telegram?: TelegramCredentials;
  };
  config?: {
    workingDir?: string;
    timeout?: number;
  };
}

/**
 * Container execution result
 */
export interface ContainerExecutionResult {
  exitCode: number;
  events: RunnerEvent[];
  timedOut: boolean;
}

/**
 * Runner events emitted from container
 */
export type RunnerEvent =
  | { type: 'workflow:started'; executionId: string; timestamp: string }
  | {
      type: 'node:started';
      nodeId: string;
      nodeName: string;
      nodeType: string;
      timestamp: string;
    }
  | {
      type: 'node:completed';
      nodeId: string;
      nodeName: string;
      nodeType: string;
      output?: Record<string, unknown>;
      duration: number;
      timestamp: string;
    }
  | {
      type: 'node:failed';
      nodeId: string;
      nodeName: string;
      nodeType: string;
      error: string;
      duration: number;
      timestamp: string;
    }
  | { type: 'workflow:completed'; result: WorkflowResult; timestamp: string }
  | {
      type: 'workflow:failed';
      error: string;
      result: WorkflowResult;
      timestamp: string;
    }
  | {
      type: 'log';
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      timestamp: string;
    };

export interface WorkflowResult {
  executionId: string;
  status: 'completed' | 'failed';
  nodeResults: Array<{
    nodeId: string;
    status: 'completed' | 'failed' | 'skipped';
    output?: Record<string, unknown>;
    error?: string;
    startedAt: string;
    completedAt: string;
    duration: number;
  }>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt: string;
  duration: number;
}

@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger = new Logger(DockerService.name);
  private docker: Docker;
  private readonly executorImage: string;
  private readonly containerPrefix = 'mitshe-exec';
  private readonly defaultTimeout = 10 * 60 * 1000; // 10 minutes
  private readonly maxTimeout = 60 * 60 * 1000; // 1 hour

  constructor(private configService: ConfigService) {
    this.docker = new Docker();
    this.executorImage =
      this.configService.get<string>('EXECUTOR_IMAGE') ||
      'ghcr.io/mitshe/mitshe-executor:latest';
  }

  async onModuleInit() {
    await this.ensureImageExists();
    await this.cleanupStaleContainers();
  }

  /**
   * Ensure the executor image exists locally
   */
  private async ensureImageExists(): Promise<void> {
    try {
      await this.docker.getImage(this.executorImage).inspect();
      this.logger.log(`Executor image found: ${this.executorImage}`);
    } catch {
      this.logger.warn(
        `Executor image not found locally: ${this.executorImage}. Will attempt to pull on first use.`,
      );
    }
  }

  /**
   * Pull the executor image if not present
   */
  async pullImage(): Promise<void> {
    this.logger.log(`Pulling executor image: ${this.executorImage}`);

    return new Promise((resolve, reject) => {
      void this.docker.pull(
        this.executorImage,
        (err: Error | null, stream: Readable) => {
          if (err) {
            this.logger.error(`Failed to pull image: ${err.message}`);
            return reject(err);
          }

          this.docker.modem.followProgress(
            stream,
            (err: Error | null) => {
              if (err) {
                this.logger.error(`Pull failed: ${err.message}`);
                return reject(err);
              }
              this.logger.log(`Successfully pulled: ${this.executorImage}`);
              resolve();
            },
            (event: { status: string }) => {
              this.logger.debug(`Pull progress: ${event.status}`);
            },
          );
        },
      );
    });
  }

  /**
   * Execute workflow in an isolated container
   * 1 workflow execution = 1 container lifecycle
   */
  async executeWorkflow(
    job: WorkflowJobPayload,
    onEvent?: (event: RunnerEvent) => void,
  ): Promise<ContainerExecutionResult> {
    const containerName = `${this.containerPrefix}-${job.executionId}`;
    const timeout = Math.min(
      job.config?.timeout || this.defaultTimeout,
      this.maxTimeout,
    );

    this.logger.log(
      `Starting workflow container: ${containerName} (timeout: ${timeout}ms)`,
    );

    let container: Docker.Container | null = null;

    try {
      // Create container
      container = await this.createWorkflowContainer(containerName, job);

      // Execute workflow and stream events
      const result = await this.runWorkflowInContainer(
        container,
        job,
        timeout,
        onEvent,
      );

      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).message?.includes('No such image')) {
        throw new Error(
          `Executor image "${this.executorImage}" not found. Build it with: just executor-build`,
        );
      }
      throw error;
    } finally {
      // Always cleanup container
      if (container) {
        await this.removeContainer(container);
      }
    }
  }

  /**
   * Create workflow container
   */
  private async createWorkflowContainer(
    name: string,
    job: WorkflowJobPayload,
  ): Promise<Docker.Container> {
    // Encode job as base64 to pass via environment variable
    const jobJson = JSON.stringify(job);
    const jobBase64 = Buffer.from(jobJson).toString('base64');

    this.logger.debug(
      `Creating container with job payload size: ${jobJson.length} bytes, base64 size: ${jobBase64.length} bytes`,
    );

    const container = await this.docker.createContainer({
      Image: this.executorImage,
      name,
      Env: [`WORKFLOW_JOB=${jobBase64}`],
      Labels: {
        'mitshe.execution-id': job.executionId,
        'mitshe.workflow-id': job.workflowId,
        'mitshe.organization-id': job.organizationId,
        'mitshe.created-at': new Date().toISOString(),
      },
      HostConfig: {
        // Resource limits
        Memory: 4 * 1024 * 1024 * 1024, // 4GB RAM
        MemorySwap: 4 * 1024 * 1024 * 1024, // No swap
        CpuPeriod: 100000,
        CpuQuota: 200000, // 2 CPU cores
        PidsLimit: 512, // Process limit

        // Security
        NetworkMode: process.env.DOCKER_NETWORK || 'bridge',
        ReadonlyRootfs: false, // Need write access for work
        SecurityOpt: ['no-new-privileges'],
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],

        // Cleanup
        AutoRemove: false, // We'll handle cleanup manually
      },
      WorkingDir: '/workspace',
      User: 'executor',
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
    });

    return container;
  }

  /**
   * Run workflow in container and stream events
   */
  private async runWorkflowInContainer(
    container: Docker.Container,
    job: WorkflowJobPayload,
    timeout: number,
    onEvent?: (event: RunnerEvent) => void,
  ): Promise<ContainerExecutionResult> {
    const events: RunnerEvent[] = [];
    let timedOut = false;

    // Attach to container stdout/stderr
    const attachOptions = {
      stream: true,
      stdout: true,
      stderr: true,
    };

    const stream = (await container.attach(
      attachOptions,
    )) as NodeJS.ReadableStream;

    // Start container (job is passed via WORKFLOW_JOB env var)
    await container.start();

    // Setup timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      this.logger.warn(
        `Workflow ${job.executionId} timed out after ${timeout}ms`,
      );
      container.kill({ signal: 'SIGTERM' }).catch((e) => {
        this.logger.error(`Failed to kill container: ${(e as Error).message}`);
      });
    }, timeout);

    return new Promise((resolve) => {
      let buffer = '';

      // Parse JSON lines from stdout
      const processOutput = (data: Buffer) => {
        buffer += data.toString('utf8');

        // Process complete JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line) as RunnerEvent;
            events.push(event);

            // Call event callback
            if (onEvent) {
              onEvent(event);
            }

            // Log events
            if (event.type === 'log') {
              this.logger[event.level](`[Container] ${event.message}`);
            }
          } catch {
            // Not JSON, log as plain text
            this.logger.debug(`[Container stdout] ${line}`);
          }
        }
      };

      // Handle container output
      stream.on('data', (chunk: Buffer) => {
        // Docker multiplexed stream format: 8 byte header + data
        // We need to demux it
        let offset = 0;
        while (offset < chunk.length) {
          if (offset + 8 > chunk.length) {
            // Incomplete header, treat rest as data
            processOutput(chunk.slice(offset));
            break;
          }

          const type = chunk[offset];
          const size = chunk.readUInt32BE(offset + 4);

          if (offset + 8 + size > chunk.length) {
            // Incomplete data, treat rest as data
            processOutput(chunk.slice(offset));
            break;
          }

          const data = chunk.slice(offset + 8, offset + 8 + size);

          if (type === 1) {
            // stdout
            processOutput(data);
          } else if (type === 2) {
            // stderr
            this.logger.warn(`[Container stderr] ${data.toString('utf8')}`);
          }

          offset += 8 + size;
        }
      });

      stream.on('end', () => {
        clearTimeout(timeoutHandle);

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer) as RunnerEvent;
            events.push(event);
            if (onEvent) {
              onEvent(event);
            }
          } catch {
            // Not JSON
          }
        }

        // Get exit code and resolve
        container
          .inspect()
          .then((info) => {
            const exitCode = info.State.ExitCode || 0;
            resolve({
              exitCode: timedOut ? 124 : exitCode,
              events,
              timedOut,
            });
          })
          .catch(() => {
            resolve({
              exitCode: timedOut ? 124 : 1,
              events,
              timedOut,
            });
          });
      });

      stream.on('error', (err) => {
        clearTimeout(timeoutHandle);
        this.logger.error(`Container stream error: ${err.message}`);
        resolve({
          exitCode: 1,
          events,
          timedOut: false,
        });
      });
    });
  }

  /**
   * Stop and remove a container
   */
  async removeContainer(container: Docker.Container): Promise<void> {
    try {
      const info = await container.inspect();
      const containerName = info.Name;

      this.logger.debug(`Removing container: ${containerName}`);

      // Stop if running
      if (info.State.Running) {
        try {
          await container.stop({ t: 5 });
        } catch {
          // Ignore stop errors
        }
      }

      await container.remove({ force: true });
      this.logger.debug(`Container removed: ${containerName}`);
    } catch (e) {
      this.logger.warn(`Failed to remove container: ${(e as Error).message}`);
    }
  }

  /**
   * Cancel a running workflow by execution ID
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const container = await this.getContainerByExecutionId(executionId);

    if (!container) {
      return false;
    }

    try {
      await container.kill({ signal: 'SIGTERM' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get container by execution ID
   */
  async getContainerByExecutionId(
    executionId: string,
  ): Promise<Docker.Container | null> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        label: [`mitshe.execution-id=${executionId}`],
      },
    });

    if (containers.length === 0) {
      return null;
    }

    return this.docker.getContainer(containers[0].Id);
  }

  /**
   * Cleanup containers older than maxAge
   */
  async cleanupStaleContainers(maxAgeMs = 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    let removed = 0;

    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['mitshe.execution-id'],
        },
      });

      for (const containerInfo of containers) {
        const createdAt = containerInfo.Labels['mitshe.created-at'];
        if (createdAt && new Date(createdAt) < cutoff) {
          try {
            const container = this.docker.getContainer(containerInfo.Id);
            await this.removeContainer(container);
            removed++;
          } catch (e) {
            this.logger.warn(
              `Failed to cleanup container ${containerInfo.Id}: ${(e as Error).message}`,
            );
          }
        }
      }

      if (removed > 0) {
        this.logger.log(`Cleaned up ${removed} stale containers`);
      }
    } catch (e) {
      this.logger.warn(
        `Failed to list containers for cleanup: ${(e as Error).message}`,
      );
    }

    return removed;
  }

  /**
   * Check if Docker is available
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Docker info
   */
  async getDockerInfo() {
    return this.docker.info();
  }
}
