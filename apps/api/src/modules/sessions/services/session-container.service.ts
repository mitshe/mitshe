import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

export interface SessionContainerConfig {
  sessionId: string;
  organizationId: string;
  repos: Array<{ name: string; cloneUrl: string; branch: string }>;
  instructions: string;
  provider?: string; // e.g. CLAUDE_CODE_LOCAL, OPENCLAW
  enableDocker?: boolean;
  environment?: {
    memoryMb?: number | null;
    cpuCores?: number | null;
    setupScript?: string | null;
    variables?: Array<{ key: string; value: string }>;
  };
}

/**
 * Manages Docker containers for agent sessions.
 * Container lifecycle, file operations, git status.
 * Terminal management is delegated to TerminalManagerService.
 */
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

  // ─── Container Lifecycle ────────────────────────────────────────

  async createAndStart(config: SessionContainerConfig): Promise<string> {
    const containerName = `${this.containerPrefix}-${config.sessionId}`;

    const sessionConfig = Buffer.from(
      JSON.stringify({
        repos: config.repos,
        instructions: config.instructions,
        provider: config.provider,
      }),
    ).toString('base64');

    this.logger.log(`Creating session container: ${containerName}`);

    const container = await this.docker.createContainer({
      Image: this.executorImage,
      name: containerName,
      User: 'root',
      Entrypoint: ['bash', '-c'],
      Cmd: [
        [
          'chown -R executor:executor /home/executor 2>/dev/null',
          // Decode setup script from base64 env var and execute as executor (avoids shell injection)
          config.environment?.setupScript
            ? 'echo "$SETUP_SCRIPT_B64" | base64 -d > /tmp/.setup.sh && chmod +x /tmp/.setup.sh && su -s /bin/bash executor -c "bash /tmp/.setup.sh" && rm -f /tmp/.setup.sh'
            : '',
          'exec su -s /bin/bash executor -c "node /session/server.js"',
        ]
          .filter(Boolean)
          .join('; '),
      ],
      Env: [
        `SESSION_CONFIG=${sessionConfig}`,
        // Setup script as base64 (decoded safely in Cmd, avoids shell injection)
        ...(config.environment?.setupScript
          ? [
              `SETUP_SCRIPT_B64=${Buffer.from(config.environment.setupScript).toString('base64')}`,
            ]
          : []),
        // Custom env vars from environment config
        ...(config.environment?.variables?.map((v) => `${v.key}=${v.value}`) ||
          []),
      ],
      WorkingDir: '/workspace',
      Labels: {
        'mitshe.type': 'session',
        'mitshe.session-id': config.sessionId,
        'mitshe.organization-id': config.organizationId,
        'mitshe.created-at': new Date().toISOString(),
      },
      HostConfig: {
        Binds: [
          `mitshe-executor-home-${config.organizationId}:/home/executor`,
          ...(config.enableDocker
            ? ['/var/run/docker.sock:/var/run/docker.sock']
            : []),
        ],
        Memory: (config.environment?.memoryMb || 4096) * 1024 * 1024,
        NanoCpus: (config.environment?.cpuCores || 2) * 1e9,
        PidsLimit: 512,
        NetworkMode: process.env.DOCKER_NETWORK || 'bridge',
        SecurityOpt: ['no-new-privileges:true'],
        CapDrop: ['ALL'],
        CapAdd: [
          'CHOWN',
          'SETUID',
          'SETGID',
          'DAC_OVERRIDE',
          ...(config.enableDocker ? ['NET_ADMIN'] : []),
        ],
      },
    });

    await container.start();

    const containerId = container.id;
    this.logger.log(
      `Session container started: ${containerName} (${containerId.slice(0, 12)})`,
    );

    return containerId;
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 5 });
    } catch (err) {
      if (!err.statusCode || err.statusCode !== 304) {
        this.logger.warn(`Failed to stop container: ${(err as Error).message}`);
      }
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
    } catch (err) {
      this.logger.warn(`Failed to remove container: ${(err as Error).message}`);
    }
  }

  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running === true;
    } catch {
      return false;
    }
  }

  // ─── File Operations ────────────────────────────────────────────

  async readFile(containerId: string, filePath: string): Promise<string> {
    return this.execCommand(containerId, ['cat', filePath]);
  }

  async writeFile(
    containerId: string,
    filePath: string,
    content: string,
  ): Promise<void> {
    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: ['tee', filePath],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      User: 'executor',
      Tty: false,
    });

    await new Promise<void>((resolve, reject) => {
      exec.start({ hijack: true, stdin: true }, (err, stream) => {
        if (err || !stream) {
          reject(err instanceof Error ? err : new Error('No stream'));
          return;
        }
        stream.write(content);
        stream.end();
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });
    });
  }

  async getFileTree(
    containerId: string,
    basePath = '/workspace',
  ): Promise<string[]> {
    const output = await this.execCommand(containerId, [
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
    ]);

    return output
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
  }

  async getGitStatus(
    containerId: string,
  ): Promise<Array<{ path: string; status: string }>> {
    const repoList = await this.execCommand(containerId, [
      'find',
      '/workspace',
      '-maxdepth',
      '2',
      '-name',
      '.git',
      '-type',
      'd',
    ]);

    const results: Array<{ path: string; status: string }> = [];

    for (const gitDir of repoList.split('\n').filter(Boolean)) {
      const repoDir = gitDir.replace('/.git', '');
      const repoName = repoDir.replace('/workspace/', '');

      const statusOutput = await this.execCommand(
        containerId,
        ['git', 'status', '--porcelain', '-uall'],
        repoDir,
      );

      for (const line of statusOutput.split('\n').filter(Boolean)) {
        const xy = line.substring(0, 2);
        const file = line.substring(3);

        let status: string;
        if (xy[0] === '?' && xy[1] === '?') status = 'untracked';
        else if (xy[0] === 'A' || xy[1] === 'A') status = 'added';
        else if (xy[0] === 'M' || xy[1] === 'M') status = 'modified';
        else if (xy[0] === 'D' || xy[1] === 'D') status = 'deleted';
        else if (xy[0] === 'R') status = 'renamed';
        else status = 'changed';

        results.push({ path: `${repoName}/${file}`, status });
      }
    }

    return results;
  }

  // ─── Exec Helper ────────────────────────────────────────────────

  async execCommand(
    containerId: string,
    cmd: string[],
    workDir = '/workspace',
  ): Promise<string> {
    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      User: 'executor',
      WorkingDir: workDir,
      Tty: false,
    });

    return new Promise((resolve) => {
      exec.start({}, (err, stream) => {
        if (err || !stream) {
          resolve('');
          return;
        }

        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          const data = Buffer.concat(chunks);
          // Demux Docker multiplexed stream
          let output = '';
          let offset = 0;
          while (offset < data.length) {
            if (offset + 8 > data.length) break;
            const type = data[offset];
            const size = data.readUInt32BE(offset + 4);
            if (offset + 8 + size > data.length) break;
            if (type === 1) {
              output += data
                .slice(offset + 8, offset + 8 + size)
                .toString('utf8');
            }
            offset += 8 + size;
          }
          resolve(output);
        });
        stream.on('error', () => resolve(''));
      });
    });
  }

  // ─── Cleanup ────────────────────────────────────────────────────

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
            `Cleaning up stale container: ${containerInfo.Names[0]}`,
          );
          await this.removeContainer(containerInfo.Id);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to cleanup: ${(err as Error).message}`);
    }
  }
}
