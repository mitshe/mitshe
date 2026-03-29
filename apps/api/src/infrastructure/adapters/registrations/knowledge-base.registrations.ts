/**
 * Knowledge Base Adapter Registrations
 * Register all knowledge base adapters with the registry
 */

import { knowledgeBaseRegistry, AdapterConfig } from '../adapter-registry';
import { createObsidianAdapter } from '../knowledge-base/obsidian.adapter';

// Register Obsidian adapter
knowledgeBaseRegistry.register('OBSIDIAN', (config: AdapterConfig) =>
  createObsidianAdapter({
    baseUrl: config.baseUrl,
    apiKey: config.apiToken || config.accessToken || '',
    insecure: config.insecure as boolean | undefined,
  })
);
