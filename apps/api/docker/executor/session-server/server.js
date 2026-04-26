#!/usr/bin/env node

/**
 * Session Server - runs inside the executor container to keep it alive
 * and set up the workspace for interactive AI sessions.
 *
 * Reads SESSION_CONFIG env var (base64 JSON):
 * {
 *   repos: [{ name, cloneUrl, branch }],
 *   instructions: string
 * }
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKSPACE = '/workspace';

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ type: 'log', level: 'info', message, timestamp }));
}

function logError(message) {
  const timestamp = new Date().toISOString();
  console.error(JSON.stringify({ type: 'log', level: 'error', message, timestamp }));
}

async function setup() {
  const configB64 = process.env.SESSION_CONFIG;
  if (!configB64) {
    log('No SESSION_CONFIG provided, starting with empty workspace');
    fs.mkdirSync(WORKSPACE, { recursive: true });
    return;
  }

  const config = JSON.parse(Buffer.from(configB64, 'base64').toString('utf-8'));

  fs.mkdirSync(WORKSPACE, { recursive: true });

  // Clone repositories
  if (config.repos && config.repos.length > 0) {
    for (const repo of config.repos) {
      const repoDir = path.join(WORKSPACE, repo.name);
      if (fs.existsSync(repoDir)) {
        log(`Repository ${repo.name} already exists, pulling latest`);
        try {
          execSync(`git -C ${repoDir} pull --ff-only`, { stdio: 'pipe' });
        } catch (e) {
          logError(`Failed to pull ${repo.name}: ${e.message}`);
        }
        continue;
      }

      log(`Cloning ${repo.name}`);
      try {
        const branch = repo.branch || 'main';
        // Clone URL may contain auth token for push access
        execSync(
          `git clone --branch ${branch} --single-branch ${repo.cloneUrl} ${repoDir}`,
          { stdio: 'pipe', timeout: 120000 },
        );
        // Store credentials so push works
        execSync(`git -C ${repoDir} config credential.helper store`, {
          stdio: 'pipe',
        });
        log(`Cloned ${repo.name} successfully`);
      } catch (e) {
        logError(`Failed to clone ${repo.name}: ${e.message}`);
      }
    }
  }

  // Write instructions file based on provider
  if (config.instructions) {
    const provider = config.provider || '';

    if (provider === 'OPENCLAW') {
      const soulMdPath = path.join(WORKSPACE, 'SOUL.md');
      fs.writeFileSync(soulMdPath, config.instructions, 'utf-8');
      log('Written SOUL.md with session instructions (OpenClaw)');
    } else if (provider === 'CLAUDE_CODE_LOCAL') {
      const claudeMdPath = path.join(WORKSPACE, 'CLAUDE.md');
      fs.writeFileSync(claudeMdPath, config.instructions, 'utf-8');
      log('Written CLAUDE.md with session instructions (Claude Code)');
    } else {
      // Unknown or no provider — write both for compatibility
      fs.writeFileSync(path.join(WORKSPACE, 'CLAUDE.md'), config.instructions, 'utf-8');
      fs.writeFileSync(path.join(WORKSPACE, 'SOUL.md'), config.instructions, 'utf-8');
      log('Written CLAUDE.md + SOUL.md with session instructions');
    }
  }

  // Write skills as ~/.claude/commands/ files (slash commands for Claude Code)
  if (config.skills && config.skills.length > 0) {
    const homeDir = process.env.HOME || '/home/executor';
    const commandsDir = path.join(homeDir, '.claude', 'commands');
    fs.mkdirSync(commandsDir, { recursive: true });

    for (const skill of config.skills) {
      const slug = skill.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const filePath = path.join(commandsDir, `${slug}.md`);
      fs.writeFileSync(filePath, skill.instructions, 'utf-8');
      log(`Written skill command: ${filePath}`);
    }

    log(`Installed ${config.skills.length} skill(s) as slash commands`);
  }

  // Set up integrations (write config file + env vars)
  if (config.integrations && config.integrations.length > 0) {
    const homeDir = process.env.HOME || '/home/executor';
    const mitsheDir = path.join(homeDir, '.mitshe');
    fs.mkdirSync(mitsheDir, { recursive: true });

    // Write integrations.json for tools/agents to read
    const integrationsFile = path.join(mitsheDir, 'integrations.json');
    fs.writeFileSync(
      integrationsFile,
      JSON.stringify(config.integrations, null, 2),
      { mode: 0o600 },
    );

    // Set environment variables per integration type
    for (const integration of config.integrations) {
      const prefix = integration.type.toUpperCase();
      for (const [key, value] of Object.entries(integration.config)) {
        if (value) {
          // Convert camelCase to UPPER_SNAKE_CASE: apiToken -> API_TOKEN
          const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
          process.env[`${prefix}_${envKey}`] = String(value);
        }
      }
    }

    log(`Configured ${config.integrations.length} integration(s): ${config.integrations.map(i => i.type).join(', ')}`);
  }

  log('Session workspace setup complete');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down');
  process.exit(0);
});

// Main
setup()
  .then(() => {
    log('Session server running, waiting for commands...');
    // Keep the process alive
    setInterval(() => {}, 30000);
  })
  .catch((err) => {
    logError(`Setup failed: ${err.message}`);
    process.exit(1);
  });
