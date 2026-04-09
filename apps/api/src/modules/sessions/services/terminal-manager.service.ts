import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { Duplex } from 'stream';

export interface TerminalInstance {
  exec: Docker.Exec;
  stream: Duplex;
  containerId: string;
}

/**
 * Manages multiple terminal instances (bash/claude) inside Docker containers.
 * Each terminal has a unique ID and its own output buffer.
 */
@Injectable()
export class TerminalManagerService {
  private readonly logger = new Logger(TerminalManagerService.name);
  private docker: Docker;

  private readonly terminals = new Map<string, TerminalInstance>();
  private readonly outputBuffers = new Map<string, string>();
  private readonly MAX_BUFFER_SIZE = 512 * 1024; // 512KB

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Start a terminal (bash, claude, etc.) inside a container.
   */
  async start(
    terminalId: string,
    containerId: string,
    onData: (data: string) => void,
    onEnd: () => void,
    options?: { cmd?: string[]; clearBuffer?: boolean },
  ): Promise<void> {
    this.close(terminalId);

    if (options?.clearBuffer) {
      this.outputBuffers.delete(terminalId);
    }

    const container = this.docker.getContainer(containerId);
    const cmd = options?.cmd || ['bash'];

    const exec = await container.exec({
      Cmd: cmd,
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
      exec.start({ hijack: true, stdin: true, Tty: true }, (err, s) => {
        if (err || !s) {
          reject(err instanceof Error ? err : new Error('No stream returned'));
          return;
        }
        resolve(s);
      });
    });

    this.terminals.set(terminalId, { exec, stream, containerId });

    if (!this.outputBuffers.has(terminalId)) {
      this.outputBuffers.set(terminalId, '');
    }

    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');

      let buf = (this.outputBuffers.get(terminalId) || '') + text;
      if (buf.length > this.MAX_BUFFER_SIZE) {
        buf = buf.slice(buf.length - this.MAX_BUFFER_SIZE);
      }
      this.outputBuffers.set(terminalId, buf);

      onData(text);
    });

    stream.on('end', () => {
      this.terminals.delete(terminalId);
      onEnd();
    });

    stream.on('error', (err) => {
      this.logger.warn(`Terminal ${terminalId} error: ${err.message}`);
      this.terminals.delete(terminalId);
      onEnd();
    });

    this.logger.log(`Terminal started: ${terminalId} [${cmd.join(' ')}]`);
  }

  /**
   * Send raw input (keystrokes) to a terminal.
   */
  sendInput(terminalId: string, data: string): boolean {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return false;

    try {
      terminal.stream.write(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get buffered output for reconnect.
   */
  getBuffer(terminalId: string): string {
    return this.outputBuffers.get(terminalId) || '';
  }

  /**
   * Close a single terminal.
   */
  close(terminalId: string): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      try {
        terminal.stream.end();
      } catch {
        // ignore
      }
      this.terminals.delete(terminalId);
    }
  }

  /**
   * Close all terminals matching a prefix (e.g. all terminals for a session).
   */
  closeByPrefix(prefix: string): void {
    for (const [id] of this.terminals) {
      if (id.startsWith(prefix)) {
        this.close(id);
      }
    }
    // Also clean buffers
    for (const [id] of this.outputBuffers) {
      if (id.startsWith(prefix)) {
        this.outputBuffers.delete(id);
      }
    }
  }

  /**
   * Check if a terminal is active.
   */
  isActive(terminalId: string): boolean {
    return this.terminals.has(terminalId);
  }
}
