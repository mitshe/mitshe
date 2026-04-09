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
  integrations?: Array<{
    type: string;
    config: Record<string, string>;
  }>;
  /**
   * Override the base image. Used when recreating a session from a
   * committed snapshot so /workspace contents are preserved.
   * Defaults to the configured executor image.
   */
  image?: string;
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
        integrations: config.integrations,
      }),
    ).toString('base64');

    this.logger.log(`Creating session container: ${containerName}`);

    const container = await this.docker.createContainer({
      Image: config.image ?? this.executorImage,
      name: containerName,
      User: 'root',
      Entrypoint: ['bash', '-c'],
      Cmd: [
        [
          'chown -R executor:executor /home/executor 2>/dev/null',
          // Start Docker daemon in background if DinD volume is mounted (runs as root)
          'if [ -d /var/lib/docker ]; then dockerd &>/var/log/dockerd.log & for i in $(seq 1 30); do docker info &>/dev/null && break || sleep 1; done; fi',
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
          // DinD: dedicated Docker data volume per session (isolated daemon)
          ...(config.enableDocker
            ? [`mitshe-dind-${config.sessionId}:/var/lib/docker`]
            : []),
        ],
        Memory: (config.environment?.memoryMb || 4096) * 1024 * 1024,
        NanoCpus: (config.environment?.cpuCores || 2) * 1e9,
        PidsLimit: config.enableDocker ? 1024 : 512,
        NetworkMode: process.env.DOCKER_NETWORK || 'bridge',
        // DinD requires privileged mode to run nested Docker daemon
        Privileged: config.enableDocker || false,
        SecurityOpt: config.enableDocker
          ? [] // privileged mode overrides security opts
          : ['no-new-privileges:true'],
        CapDrop: config.enableDocker ? [] : ['ALL'],
        CapAdd: config.enableDocker
          ? [] // privileged grants all capabilities
          : ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
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

  async removeContainer(
    containerId: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
    } catch (err) {
      this.logger.warn(`Failed to remove container: ${(err as Error).message}`);
    }

    // Cleanup DinD volume if exists
    if (sessionId) {
      try {
        const volume = this.docker.getVolume(`mitshe-dind-${sessionId}`);
        await volume.remove();
      } catch {
        // Volume may not exist (non-DinD session)
      }
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

  /**
   * Returns container state: 'running', 'stopped' (exists but not running), or 'gone'.
   */
  async getContainerState(
    containerId: string,
  ): Promise<'running' | 'stopped' | 'gone'> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running ? 'running' : 'stopped';
    } catch {
      return 'gone';
    }
  }

  /**
   * Restart a stopped container (e.g. after host reboot / Exited 255).
   */
  async restartContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
    this.logger.log(
      `Restarted stopped container: ${containerId.slice(0, 12)}`,
    );
  }

  // ─── Clone Operations ───────────────────────────────────────────

  /**
   * Commit a container's current state to a Docker image (snapshot).
   * Returns the image name in format "mitshe-clone:{sessionId}".
   */
  async commitContainer(
    containerId: string,
    sessionId: string,
  ): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const repo = 'mitshe-clone';
    const tag = sessionId;

    await container.commit({ repo, tag, comment: `Clone snapshot of session ${sessionId}` });
    const imageName = `${repo}:${tag}`;
    this.logger.log(
      `Committed container ${containerId.slice(0, 12)} → image ${imageName}`,
    );
    return imageName;
  }

  /**
   * Create and start a container from a previously committed image.
   * Simplified variant of createAndStart — skips repo cloning and setup scripts
   * since those are already baked into the committed image.
   */
  async createFromCommittedImage(
    image: string,
    config: {
      sessionId: string;
      organizationId: string;
      enableDocker?: boolean;
      environment?: { memoryMb?: number | null; cpuCores?: number | null };
    },
  ): Promise<string> {
    const containerName = `${this.containerPrefix}-${config.sessionId}`;
    this.logger.log(
      `Creating cloned container from image ${image}: ${containerName}`,
    );

    const container = await this.docker.createContainer({
      Image: image,
      name: containerName,
      User: 'root',
      Entrypoint: ['bash', '-c'],
      Cmd: [
        [
          'chown -R executor:executor /home/executor 2>/dev/null',
          config.enableDocker
            ? 'if [ -d /var/lib/docker ]; then dockerd &>/var/log/dockerd.log & for i in $(seq 1 30); do docker info &>/dev/null && break || sleep 1; done; fi'
            : '',
          'exec su -s /bin/bash executor -c "node /session/server.js"',
        ]
          .filter(Boolean)
          .join('; '),
      ],
      WorkingDir: '/workspace',
      Labels: {
        'mitshe.type': 'session',
        'mitshe.session-id': config.sessionId,
        'mitshe.organization-id': config.organizationId,
        'mitshe.created-at': new Date().toISOString(),
        'mitshe.cloned': 'true',
      },
      HostConfig: {
        Binds: [
          `mitshe-executor-home-${config.organizationId}:/home/executor`,
          ...(config.enableDocker
            ? [`mitshe-dind-${config.sessionId}:/var/lib/docker`]
            : []),
        ],
        Memory:
          (config.environment?.memoryMb || 4096) * 1024 * 1024,
        NanoCpus: (config.environment?.cpuCores || 2) * 1e9,
        PidsLimit: config.enableDocker ? 1024 : 512,
        NetworkMode: process.env.DOCKER_NETWORK || 'bridge',
        Privileged: config.enableDocker || false,
        SecurityOpt: config.enableDocker
          ? []
          : ['no-new-privileges:true'],
        CapDrop: config.enableDocker ? [] : ['ALL'],
        CapAdd: config.enableDocker
          ? []
          : ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
      },
    });

    await container.start();

    const containerId = container.id;
    this.logger.log(
      `Cloned container started: ${containerName} (${containerId.slice(0, 12)})`,
    );
    return containerId;
  }

  /**
   * Remove a Docker image (used to cleanup after clone).
   */
  async removeImage(imageName: string): Promise<void> {
    try {
      const image = this.docker.getImage(imageName);
      await image.remove();
      this.logger.log(`Removed clone image: ${imageName}`);
    } catch (err) {
      this.logger.warn(
        `Failed to remove image ${imageName}: ${(err as Error).message}`,
      );
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
          await this.removeContainer(
            containerInfo.Id,
            containerInfo.Labels['mitshe.session-id'],
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to cleanup: ${(err as Error).message}`);
    }
  }
}
