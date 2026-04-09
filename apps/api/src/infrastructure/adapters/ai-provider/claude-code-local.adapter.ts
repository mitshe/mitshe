import { Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AIProviderPort,
  Message,
  AIResponse,
  AIResponseWithTools,
  CompletionOptions,
  ToolDefinition,
  StreamEvent,
} from '../../../ports/ai-provider.port';

/**
 * Claude Code Local Adapter
 *
 * Uses the locally installed Claude Code CLI to execute prompts.
 * This is for LOCAL development mode - no containers, uses /tmp for workdir.
 *
 * Requirements:
 * - Claude Code CLI must be installed (`claude` command available)
 * - Must be authenticated with Claude Code
 */
export class ClaudeCodeLocalAdapter implements AIProviderPort {
  private readonly logger = new Logger(ClaudeCodeLocalAdapter.name);
  private readonly workDir: string;

  constructor() {
    // Create a dedicated work directory in /tmp
    this.workDir = path.join(os.tmpdir(), 'ai-tasks-workflows');
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
    }
    this.logger.log(
      `Claude Code Local adapter initialized. Work dir: ${this.workDir}`,
    );
  }

  getProviderType(): 'local' {
    return 'local';
  }

  getProviderName(): string {
    return 'Claude Code (Local)';
  }

  async isAvailable(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // CLI providers run inside executor containers, not on the API server.
    // The executor image has Claude Code pre-installed.
    return { success: true };
  }

  listModels(): Promise<string[]> {
    // Claude Code uses whatever model is configured
    return Promise.resolve(['claude-code-local']);
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<AIResponse> {
    const startTime = Date.now();

    // Build the prompt from messages
    let prompt = '';

    if (options?.systemPrompt) {
      prompt += `System: ${options.systemPrompt}\n\n`;
    }

    for (const msg of messages) {
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .filter((c) => c.type === 'text')
              .map((c: any) => c.text)
              .join('\n');

      if (msg.role === 'user') {
        prompt += `${content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${content}\n`;
      } else if (msg.role === 'system') {
        prompt += `System: ${content}\n`;
      }
    }

    this.logger.debug(
      `Executing prompt with Claude Code CLI (${prompt.length} chars)`,
    );

    try {
      // Execute claude with the prompt
      // Using --print for non-interactive mode, --output-format json for structured output
      const result = await this.executeClaudePrompt(prompt, options?.maxTokens);

      const duration = Date.now() - startTime;
      this.logger.debug(`Claude Code response received in ${duration}ms`);

      return {
        content: result.content,
        model: 'claude-code-local',
        tokensUsed: {
          input: Math.ceil(prompt.length / 4), // Approximate
          output: Math.ceil(result.content.length / 4),
        },
        finishReason: 'stop',
      };
    } catch (error) {
      this.logger.error(`Claude Code execution failed: ${error.message}`);
      throw error;
    }
  }

  async completeWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options?: CompletionOptions,
  ): Promise<AIResponseWithTools> {
    // Claude Code CLI doesn't support tool calling in the same way
    // Just execute as a regular completion
    const response = await this.complete(messages, options);

    return {
      ...response,
      stopReason: 'end_turn',
    };
  }

  async *streamComplete(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<StreamEvent, void, unknown> {
    // For streaming, we execute and return the full response
    // Claude Code CLI doesn't support streaming in non-interactive mode
    const response = await this.complete(messages, options);

    yield {
      type: 'text_delta',
      text: response.content,
    };

    yield {
      type: 'message_stop',
    };
  }

  countTokens(text: string): Promise<number> {
    // Approximate: ~4 characters per token
    return Promise.resolve(Math.ceil(text.length / 4));
  }

  /**
   * Get the work directory for this adapter
   */
  getWorkDir(): string {
    return this.workDir;
  }

  /**
   * Clean up work directory
   */
  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.workDir)) {
        await fs.promises.rm(this.workDir, { recursive: true, force: true });
        this.logger.log(`Cleaned up work directory: ${this.workDir}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to clean up work directory: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Execute a prompt using Claude Code CLI
   */
  private async executeClaudePrompt(
    prompt: string,
    _maxTokens?: number,
  ): Promise<{ content: string }> {
    // Create a temp file for the prompt (for longer prompts)
    const promptFile = path.join(this.workDir, `prompt-${Date.now()}.txt`);
    fs.writeFileSync(promptFile, prompt);

    try {
      // Build command args
      const args = [
        '--print', // Non-interactive mode, just print the response
        '--dangerously-skip-permissions', // Skip permission prompts for automation
      ];

      // Note: Don't use --max-turns as it causes "Reached max turns" errors
      // Claude Code will naturally complete after responding to the prompt

      this.logger.debug(`Executing Claude CLI with args: ${args.join(' ')}`);

      // Execute: cat prompt | claude --print
      const result = await this.executePipedCommand(
        'cat',
        [promptFile],
        'claude',
        args,
      );

      this.logger.debug(
        `Claude CLI result - exit code: ${result.exitCode}, stdout: ${result.stdout.length} chars, stderr: ${result.stderr.length} chars`,
      );

      if (result.stderr) {
        this.logger.warn(`Claude CLI stderr: ${result.stderr}`);
      }

      if (result.exitCode !== 0) {
        throw new Error(
          `Claude Code CLI error (exit ${result.exitCode}): ${result.stderr || result.stdout || 'Unknown error'}`,
        );
      }

      // Check if response indicates an error
      const content = result.stdout.trim();
      if (content.startsWith('Error:')) {
        throw new Error(`Claude Code error: ${content}`);
      }

      return { content };
    } finally {
      // Clean up prompt file
      if (fs.existsSync(promptFile)) {
        fs.unlinkSync(promptFile);
      }
    }
  }

  /**
   * Execute a command and return the result
   */
  private executeCommand(
    command: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: this.workDir,
        env: { ...process.env },
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
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      proc.on('error', (error) => {
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          proc.kill();
          reject(new Error('Command timed out'));
        },
        5 * 60 * 1000,
      );
    });
  }

  /**
   * Execute a piped command: cmd1 | cmd2
   */
  private executePipedCommand(
    cmd1: string,
    args1: string[],
    cmd2: string,
    args2: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc1 = spawn(cmd1, args1, {
        cwd: this.workDir,
        env: { ...process.env },
      });

      const proc2 = spawn(cmd2, args2, {
        cwd: this.workDir,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Pipe stdout of proc1 to stdin of proc2
      proc1.stdout.pipe(proc2.stdin);

      let stdout = '';
      let stderr = '';

      proc2.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc2.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc1.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc2.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      proc2.on('error', (error) => {
        reject(error);
      });

      proc1.on('error', (error) => {
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          proc1.kill();
          proc2.kill();
          reject(new Error('Command timed out'));
        },
        5 * 60 * 1000,
      );
    });
  }
}

/**
 * Factory function to create Claude Code Local adapter
 */
export function createClaudeCodeLocalAdapter(): AIProviderPort {
  return new ClaudeCodeLocalAdapter();
}
