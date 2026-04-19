/**
 * Logger - emits JSON lines to stdout for host to parse
 */

import type { RunnerEvent } from './types.js';

/**
 * Emit event to stdout as JSON line
 * Returns a promise that resolves when the data is flushed
 */
export function emit(event: RunnerEvent): Promise<void> {
  return new Promise((resolve) => {
    const data = JSON.stringify(event) + '\n';
    if (process.stdout.write(data)) {
      resolve();
    } else {
      process.stdout.once('drain', resolve);
    }
  });
}

export function log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
  emit({
    type: 'log',
    level,
    message,
    timestamp: new Date().toISOString(),
  });
}

export const logger = {
  debug: (msg: string) => log('debug', msg),
  info: (msg: string) => log('info', msg),
  warn: (msg: string) => log('warn', msg),
  error: (msg: string) => log('error', msg),
  /** Log a CLI command + its output as structured event */
  cmd: (command: string, output?: string) => {
    emit({
      type: 'cmd',
      command,
      output: output || '',
      timestamp: new Date().toISOString(),
    });
  },
};
