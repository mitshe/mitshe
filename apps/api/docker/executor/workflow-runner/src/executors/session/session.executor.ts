/**
 * Session Executor - manages agent sessions from workflows.
 *
 * Communicates with the mitshe API to create, execute commands in,
 * read files from, and stop sessions.
 */

import { BaseExecutor, type ExecutorContext } from '../base.js';

export class SessionExecutor extends BaseExecutor {
  readonly supportedTypes = [
    'action:session_create',
    'action:session_exec',
    'action:session_agent',
    'action:session_stop',
    'action:session_read_file',
    'action:session_write_file',
    'data:session_git_diff',
    'data:session_files',
  ];

  async execute(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ): Promise<Record<string, unknown>> {
    const nodeType = this.getString(config, '__nodeType', '');

    switch (nodeType) {
      case 'action:session_create':
        return this.createSession(config, ctx);
      case 'action:session_exec':
        return this.execCommand(config, ctx);
      case 'action:session_agent':
        return this.runAgent(config, ctx);
      case 'action:session_stop':
        return this.stopSession(config, ctx);
      case 'action:session_read_file':
        return this.readFile(config, ctx);
      case 'action:session_write_file':
        return this.writeFile(config, ctx);
      case 'data:session_git_diff':
        return this.getGitDiff(config, ctx);
      case 'data:session_files':
        return this.listFiles(config, ctx);
      default:
        throw new Error(`Unknown session node type: ${nodeType}`);
    }
  }

  private getApiConfig(ctx: ExecutorContext) {
    const baseUrl =
      (ctx.credentials as any).apiBaseUrl ||
      process.env.API_BASE_URL ||
      'http://host.docker.internal:3001';
    const token =
      (ctx.credentials as any).apiToken || process.env.API_TOKEN || '';

    return { baseUrl, token };
  }

  private async apiCall(
    ctx: ExecutorContext,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<any> {
    const { baseUrl, token } = this.getApiConfig(ctx);
    const url = `${baseUrl}/api/v1${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API call failed: ${res.status} ${text}`);
    }

    return res.json();
  }

  private async createSession(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const name = this.getString(config, 'name');
    const repositoryIds = (config.repositoryIds as string[]) || [];
    const instructions = this.getOptionalString(config, 'instructions');
    const presetId = this.getOptionalString(config, 'presetId');
    const environmentId = this.getOptionalString(config, 'environmentId');

    const result = await this.apiCall(ctx, 'POST', '/sessions', {
      name,
      repositoryIds,
      instructions,
      agentDefinitionId: presetId,
      environmentId,
    });

    const session = result.session;

    // Store session ID in workflow context for subsequent nodes
    this.setContext(ctx, 'sessionId', session.id);

    // Wait for session to start (poll status)
    let status = session.status;
    const maxWait = 60000; // 60s
    const start = Date.now();

    while (status === 'CREATING' && Date.now() - start < maxWait) {
      await new Promise((r) => setTimeout(r, 2000));
      const check = await this.apiCall(
        ctx,
        'GET',
        `/sessions/${session.id}`,
      );
      status = check.session.status;
    }

    return {
      sessionId: session.id,
      containerId: session.containerId || '',
      status,
    };
  }

  private async execCommand(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const sessionId =
      this.getOptionalString(config, 'sessionId') ||
      (ctx.workflowContext.sessionId as string);
    const command = this.getString(config, 'command');
    const timeout = (config.timeout as number) || undefined;

    const result = await this.apiCall(
      ctx,
      'POST',
      `/sessions/${sessionId}/exec`,
      { command, timeout },
    );

    return {
      stdout: result.stdout,
      exitCode: result.exitCode,
      duration: result.duration,
    };
  }

  private async runAgent(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const sessionId =
      this.getOptionalString(config, 'sessionId') ||
      (ctx.workflowContext.sessionId as string);
    const prompt = this.getString(config, 'prompt');
    const provider = this.getOptionalString(config, 'provider') || 'claude';
    const startArgs = this.getOptionalString(config, 'startArguments') || '';
    const timeout = (config.timeout as number) || 300000; // 5 min default

    // Build agent command: claude -p "prompt" or openclaw tui -p "prompt"
    const cli = provider === 'openclaw' ? 'openclaw tui' : 'claude';
    const argsStr = startArgs ? ` ${startArgs}` : '';
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const command = `${cli} -p '${escapedPrompt}'${argsStr}`;

    const result = await this.apiCall(
      ctx,
      'POST',
      `/sessions/${sessionId}/exec`,
      { command, timeout },
    );

    return {
      output: result.stdout,
      exitCode: result.exitCode,
      duration: result.duration,
    };
  }

  private async stopSession(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const sessionId =
      this.getOptionalString(config, 'sessionId') ||
      (ctx.workflowContext.sessionId as string);
    const shouldDelete = this.getBoolean(config, 'delete', false);

    if (shouldDelete) {
      await this.apiCall(ctx, 'DELETE', `/sessions/${sessionId}`);
      return { status: 'deleted' };
    }

    const result = await this.apiCall(
      ctx,
      'POST',
      `/sessions/${sessionId}/stop`,
    );

    return { status: result.status };
  }

  private async readFile(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const sessionId =
      this.getOptionalString(config, 'sessionId') ||
      (ctx.workflowContext.sessionId as string);
    const path = this.getString(config, 'path');

    const result = await this.apiCall(
      ctx,
      'GET',
      `/sessions/${sessionId}/file?path=${encodeURIComponent(path)}`,
    );

    return { content: result.content, path: result.path };
  }

  private async writeFile(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const sessionId =
      this.getOptionalString(config, 'sessionId') ||
      (ctx.workflowContext.sessionId as string);
    const path = this.getString(config, 'path');
    const content = this.getString(config, 'content');

    await this.apiCall(ctx, 'POST', `/sessions/${sessionId}/file`, {
      path,
      content,
    });

    return { status: 'saved', path };
  }

  private async getGitDiff(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const sessionId =
      this.getOptionalString(config, 'sessionId') ||
      (ctx.workflowContext.sessionId as string);
    const staged = this.getBoolean(config, 'staged', false);

    const gitCmd = staged ? 'git diff --cached' : 'git diff';
    const result = await this.apiCall(
      ctx,
      'POST',
      `/sessions/${sessionId}/exec`,
      { command: `cd /workspace && ${gitCmd}` },
    );

    const diff = result.stdout || '';
    const lines = diff.split('\n');
    const additions = lines.filter((l: string) =>
      l.startsWith('+') && !l.startsWith('+++'),
    ).length;
    const deletions = lines.filter((l: string) =>
      l.startsWith('-') && !l.startsWith('---'),
    ).length;
    const filesChanged = lines.filter((l: string) =>
      l.startsWith('diff --git'),
    ).length;

    return { diff, filesChanged, additions, deletions };
  }

  private async listFiles(
    config: Record<string, unknown>,
    ctx: ExecutorContext,
  ) {
    const sessionId =
      this.getOptionalString(config, 'sessionId') ||
      (ctx.workflowContext.sessionId as string);
    const path = this.getOptionalString(config, 'path');

    const result = await this.apiCall(
      ctx,
      'GET',
      `/sessions/${sessionId}/files${path ? `?path=${encodeURIComponent(path)}` : ''}`,
    );

    return { files: result.files };
  }
}
