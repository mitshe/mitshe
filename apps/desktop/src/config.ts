import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface AppConfig {
  mode: 'local' | 'remote' | null; // null = not configured yet
  remoteUrl: string;
}

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  mode: null,
  remoteUrl: '',
};

export function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch {
    // corrupted config, reset
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getWebUrl(config: AppConfig): string {
  if (config.mode === 'remote') {
    return config.remoteUrl.replace(/\/$/, '');
  }
  return 'http://localhost:13000';
}
