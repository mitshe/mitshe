/**
 * Git Provider Adapter Registrations
 * Register all git provider adapters with the registry
 */

import { gitProviderRegistry, AdapterConfig } from '../adapter-registry';
import { createGitLabAdapter } from '../git-provider/gitlab.adapter';
import { createGitHubAdapter } from '../git-provider/github.adapter';

// Register GitLab adapter
gitProviderRegistry.register('GITLAB', (config: AdapterConfig) =>
  createGitLabAdapter({
    baseUrl: config.baseUrl,
    accessToken: config.accessToken || config.apiToken || '',
    tokenType: config.tokenType as 'private' | 'oauth',
  })
);

// Register GitHub adapter
gitProviderRegistry.register('GITHUB', (config: AdapterConfig) =>
  createGitHubAdapter({
    baseUrl: config.baseUrl,
    accessToken: config.accessToken || config.apiToken || '',
  })
);
