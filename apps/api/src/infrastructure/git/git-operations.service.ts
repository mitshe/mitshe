import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../adapters/adapter-factory.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { IntegrationStatus } from '@prisma/client';

export interface CloneOptions {
  depth?: number; // Shallow clone depth
  branch?: string; // Specific branch to clone
}

export interface CommitOptions {
  authorName?: string;
  authorEmail?: string;
}

export interface MergeRequestResult {
  id: string;
  iid: number;
  webUrl: string;
  title: string;
}

@Injectable()
export class GitOperationsService {
  private readonly logger = new Logger(GitOperationsService.name);
  private readonly baseWorkDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactoryService,
    private readonly encryption: EncryptionService,
  ) {
    // Base directory for all git operations
    this.baseWorkDir = path.join(os.tmpdir(), 'ai-tasks-git');
    if (!fs.existsSync(this.baseWorkDir)) {
      fs.mkdirSync(this.baseWorkDir, { recursive: true });
    }
    this.logger.log(`Git operations base directory: ${this.baseWorkDir}`);
  }

  /**
   * Create a unique work directory for an execution
   */
  createWorkDir(executionId: string): string {
    const workDir = path.join(this.baseWorkDir, executionId);
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }
    return workDir;
  }

  /**
   * Clone a repository to the work directory
   */
  async cloneRepository(
    repositoryId: string,
    workDir: string,
    options: CloneOptions = {},
  ): Promise<string> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        integration: true,
      },
    });

    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    if (
      !repository.integration ||
      repository.integration.status !== IntegrationStatus.CONNECTED
    ) {
      throw new Error(
        `Integration for repository ${repositoryId} is not connected`,
      );
    }

    // Get clone URL with authentication
    const cloneUrl = this.getAuthenticatedCloneUrl(repository);

    const repoDir = path.join(workDir, repository.name);

    // Build clone command
    const args = ['clone'];

    if (options.depth) {
      args.push('--depth', options.depth.toString());
    }

    if (options.branch) {
      args.push('--branch', options.branch);
    }

    args.push(cloneUrl, repoDir);

    this.logger.log(`Cloning repository ${repository.fullPath} to ${repoDir}`);

    await this.executeGit(args, workDir);

    this.logger.log(`Successfully cloned ${repository.fullPath}`);

    return repoDir;
  }

  /**
   * Create a new branch from the current HEAD
   */
  async createBranch(
    repoDir: string,
    branchName: string,
    fromRef?: string,
  ): Promise<void> {
    this.logger.log(`Creating branch ${branchName} in ${repoDir}`);

    // First fetch to make sure we have latest
    await this.executeGit(['fetch', 'origin'], repoDir);

    // Create and checkout the new branch
    if (fromRef) {
      await this.executeGit(['checkout', '-b', branchName, fromRef], repoDir);
    } else {
      await this.executeGit(['checkout', '-b', branchName], repoDir);
    }

    this.logger.log(`Created and checked out branch ${branchName}`);
  }

  /**
   * Stage all changes
   */
  async stageAll(repoDir: string): Promise<void> {
    await this.executeGit(['add', '-A'], repoDir);
  }

  /**
   * Commit staged changes
   */
  async commit(
    repoDir: string,
    message: string,
    options: CommitOptions = {},
  ): Promise<string> {
    const args = ['commit', '-m', message];

    if (options.authorName && options.authorEmail) {
      args.push('--author', `${options.authorName} <${options.authorEmail}>`);
    }

    await this.executeGit(args, repoDir);

    // Get the commit hash
    const hashResult = await this.executeGit(['rev-parse', 'HEAD'], repoDir);
    return hashResult.stdout.trim();
  }

  /**
   * Push branch to remote
   */
  async push(
    repoDir: string,
    branchName: string,
    setUpstream: boolean = true,
  ): Promise<void> {
    this.logger.log(`Pushing branch ${branchName}`);

    const args = ['push'];
    if (setUpstream) {
      args.push('-u', 'origin', branchName);
    } else {
      args.push('origin', branchName);
    }

    await this.executeGit(args, repoDir);

    this.logger.log(`Successfully pushed ${branchName}`);
  }

  /**
   * Create a merge/pull request via the git provider API
   */
  async createMergeRequest(
    repositoryId: string,
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description: string,
  ): Promise<MergeRequestResult> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        integration: true,
        organization: true,
      },
    });

    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    // Create git provider adapter
    const adapter = await this.adapterFactory.createGitProviderFromIntegration(
      repository.organizationId,
      repository.integrationId,
    );

    this.logger.log(
      `Creating MR: ${sourceBranch} -> ${targetBranch} in ${repository.fullPath}`,
    );

    const mr = await adapter.createMergeRequest(repository.externalId, {
      title,
      description,
      sourceBranch,
      targetBranch,
    });

    this.logger.log(`Created MR #${mr.iid}: ${mr.webUrl}`);

    return {
      id: mr.id,
      iid: mr.iid,
      webUrl: mr.webUrl,
      title: mr.title,
    };
  }

  /**
   * Get the current branch name
   */
  async getCurrentBranch(repoDir: string): Promise<string> {
    const result = await this.executeGit(
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      repoDir,
    );
    return result.stdout.trim();
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasChanges(repoDir: string): Promise<boolean> {
    const result = await this.executeGit(['status', '--porcelain'], repoDir);
    return result.stdout.trim().length > 0;
  }

  /**
   * Get list of changed files
   */
  async getChangedFiles(repoDir: string): Promise<string[]> {
    const result = await this.executeGit(['status', '--porcelain'], repoDir);
    return result.stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.substring(3)); // Remove status prefix
  }

  /**
   * Clean up a work directory
   */
  async cleanup(workDir: string): Promise<void> {
    try {
      if (fs.existsSync(workDir)) {
        await fs.promises.rm(workDir, { recursive: true, force: true });
        this.logger.log(`Cleaned up work directory: ${workDir}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to clean up ${workDir}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Clean up all old work directories (older than specified hours)
   */
  async cleanupOld(maxAgeHours: number = 24): Promise<number> {
    let cleaned = 0;
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    try {
      const dirs = fs.readdirSync(this.baseWorkDir);
      for (const dir of dirs) {
        const fullPath = path.join(this.baseWorkDir, dir);
        const stat = fs.statSync(fullPath);

        if (now - stat.mtimeMs > maxAge) {
          await this.cleanup(fullPath);
          cleaned++;
        }
      }
    } catch (error) {
      this.logger.warn(`Error during cleanup: ${(error as Error).message}`);
    }

    return cleaned;
  }

  /**
   * Generate branch name from pattern and task data
   */
  generateBranchName(
    pattern: string,
    taskData: {
      key?: string;
      title?: string;
      id?: string;
    },
  ): string {
    let branchName = pattern;

    // Replace variables
    if (taskData.key) {
      branchName = branchName.replace(/\{\{task\.key\}\}/g, taskData.key);
    }

    if (taskData.title) {
      branchName = branchName.replace(/\{\{task\.title\}\}/g, taskData.title);
      // Slug version
      const slug = this.slugify(taskData.title);
      branchName = branchName.replace(/\{\{task\.title\|slug\}\}/g, slug);
    }

    if (taskData.id) {
      branchName = branchName.replace(/\{\{task\.id\}\}/g, taskData.id);
    }

    // Clean up the branch name
    return this.sanitizeBranchName(branchName);
  }

  /**
   * Convert text to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50); // Limit length
  }

  /**
   * Sanitize branch name to be git-compatible
   */
  private sanitizeBranchName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9/_-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  /**
   * Get authenticated clone URL
   */
  private getAuthenticatedCloneUrl(repository: {
    cloneUrl: string;
    integration: { config: Uint8Array; configIv: Uint8Array } | null;
  }): string {
    if (!repository.integration) {
      return repository.cloneUrl;
    }

    // Decrypt integration config
    const config = this.encryption.decryptJson<{
      accessToken?: string;
      apiToken?: string;
    }>(
      Buffer.from(repository.integration.config),
      Buffer.from(repository.integration.configIv),
    );

    const token = config.accessToken || config.apiToken;
    if (!token) {
      return repository.cloneUrl;
    }

    // Convert HTTPS URL to include token
    // https://gitlab.com/user/repo.git -> https://oauth2:TOKEN@gitlab.com/user/repo.git
    // https://github.com/user/repo.git -> https://TOKEN@github.com/user/repo.git

    const url = new URL(repository.cloneUrl);

    if (url.hostname.includes('gitlab')) {
      url.username = 'oauth2';
      url.password = token;
    } else if (url.hostname.includes('github')) {
      url.username = token;
      url.password = 'x-oauth-basic';
    } else {
      // Generic: use token as password
      url.password = token;
    }

    return url.toString();
  }

  /**
   * Execute a git command
   */
  private executeGit(
    args: string[],
    cwd: string,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Executing: git ${args.join(' ')} in ${cwd}`);

      const proc = spawn('git', args, {
        cwd,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0', // Disable interactive prompts
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const error = new Error(
            `Git command failed: git ${args.join(' ')}\n${stderr || stdout}`,
          );
          reject(error);
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          proc.kill();
          reject(new Error('Git command timed out'));
        },
        5 * 60 * 1000,
      );
    });
  }
}
