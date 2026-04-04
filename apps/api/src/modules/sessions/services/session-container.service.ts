import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { Duplex } from 'stream';

export interface SessionContainerConfig {
  sessionId: string;
  organizationId: string;
  repos: Array<{ name: string; cloneUrl: string; branch: string }>;
  instructions: string;
}

/**
 * Represents a running interactive Claude session inside a container.
 * The stream is a bidirectional PTY: write to send keystrokes, read to get terminal output.
 */
export interface InteractiveSession {
  exec: Docker.Exec;
  stream: Duplex;
}

@Injectable()
export class SessionContainerService implements OnModuleInit {
  private readonly logger = new Logger(SessionContainerService.name);
  private docker: Docker;
  private readonly executorImage: string;
  private readonly containerPrefix = 'mitshe-session';

  /** Active interactive sessions: sessionId → InteractiveSession */
  private readonly activeSessions = new Map<string, InteractiveSession>();

  /** Terminal output buffer per session (for reconnect) */
  private readonly outputBuffers = new Map<string, string>();
  private readonly MAX_BUFFER_SIZE = 512 * 1024; // 512KB

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

    this.logger.log(`Creating session container: ${containerName}`);

    const container = await this.docker.createContainer({
      Image: this.executorImage,
      name: containerName,
      // Start as root to fix volume permissions, then drop to executor
      User: 'root',
      Entrypoint: ['bash', '-c'],
      Cmd: [
        'chown -R executor:executor /home/executor/.claude 2>/dev/null; exec su -s /bin/bash executor -c "node /session/server.js"',
      ],
      Env: [`SESSION_CONFIG=${sessionConfig}`],
      WorkingDir: '/workspace',
      Labels: {
        'mitshe.type': 'session',
        'mitshe.session-id': config.sessionId,
        'mitshe.organization-id': config.organizationId,
        'mitshe.created-at': new Date().toISOString(),
      },
      HostConfig: {
        // Shared volume for Claude Code auth — first session logs in,
        // all subsequent sessions reuse the token automatically
        Binds: ['mitshe-claude-config:/home/executor/.claude'],
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
   * Start an interactive Claude Code session inside the container.
   * Returns a bidirectional PTY stream — write stdin, read stdout.
   */
  async startInteractiveSession(
    sessionId: string,
    containerId: string,
    onData: (data: string) => void,
    onEnd: () => void,
  ): Promise<void> {
    // Kill previous session if exists
    this.closeInteractiveSession(sessionId);

    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: ['claude'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      User: 'executor',
      WorkingDir: '/workspace',
      Env: [
        'TERM=xterm-256color',
        'COLUMNS=120',
        'LINES=40',
        'HOME=/home/executor',
      ],
    });

    const stream: Duplex = await new Promise((resolve, reject) => {
      exec.start(
        { hijack: true, stdin: true, Tty: true },
        (err, s) => {
          if (err || !s) {
            reject(err || new Error('No stream returned'));
            return;
          }
          resolve(s);
        },
      );
    });

    this.activeSessions.set(sessionId, { exec, stream });

    // Initialize buffer
    if (!this.outputBuffers.has(sessionId)) {
      this.outputBuffers.set(sessionId, '');
    }

    // Forward terminal output — TTY mode means no demuxing needed
    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');

      // Append to buffer (trim if too large)
      let buf = (this.outputBuffers.get(sessionId) || '') + text;
      if (buf.length > this.MAX_BUFFER_SIZE) {
        buf = buf.slice(buf.length - this.MAX_BUFFER_SIZE);
      }
      this.outputBuffers.set(sessionId, buf);

      onData(text);
    });

    stream.on('end', () => {
      this.activeSessions.delete(sessionId);
      onEnd();
    });

    stream.on('error', (err) => {
      this.logger.warn(`Session ${sessionId} stream error: ${err.message}`);
      this.activeSessions.delete(sessionId);
      onEnd();
    });

    this.logger.log(`Interactive Claude session started for ${sessionId}`);
  }

  /**
   * Send raw terminal input (keystrokes) to the interactive session
   */
  sendInput(sessionId: string, data: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    try {
      session.stream.write(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get buffered terminal output (for reconnect)
   */
  getOutputBuffer(sessionId: string): string {
    return this.outputBuffers.get(sessionId) || '';
  }

  /**
   * Close the interactive session stream
   */
  closeInteractiveSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      try {
        session.stream.end();
      } catch {
        // ignore
      }
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Check if there's an active interactive session
   */
  hasActiveSession(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
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
      User: 'executor',
      Tty: false,
    });

    return new Promise((resolve) => {
      exec.start({}, (err, stream) => {
        if (err || !stream) {
          resolve([]);
          return;
        }

        let output = '';
        stream.on('data', (chunk: Buffer) => {
          // Non-TTY: demux multiplexed stream
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
              output += chunk
                .slice(offset + 8, offset + 8 + size)
                .toString('utf8');
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
   * Stop a container
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

      const maxAge = 48 * 60 * 60 * 1000;
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
