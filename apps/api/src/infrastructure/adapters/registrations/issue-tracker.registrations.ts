/**
 * Issue Tracker Adapter Registrations
 * Register all issue tracker adapters with the registry
 */

import { issueTrackerRegistry, AdapterConfig } from '../adapter-registry';
import { createJiraAdapter } from '../issue-tracker/jira.adapter';
import { createYouTrackAdapter } from '../issue-tracker/youtrack.adapter';
import { createLinearAdapter } from '../issue-tracker/linear.adapter';
import { createTrelloAdapter } from '../issue-tracker/trello.adapter';

// Register JIRA adapter
issueTrackerRegistry.register('JIRA', (config: AdapterConfig) =>
  createJiraAdapter({
    baseUrl: config.baseUrl || '',
    email: config.email || '',
    apiToken: config.apiToken || config.accessToken || '',
    isCloud: config.baseUrl?.includes('atlassian.net'),
  }),
);

// Register YouTrack adapter
issueTrackerRegistry.register('YOUTRACK', (config: AdapterConfig) =>
  createYouTrackAdapter({
    baseUrl: config.baseUrl || '',
    permanentToken: config.apiToken || config.accessToken || '',
  }),
);

// Register Linear adapter
issueTrackerRegistry.register('LINEAR', (config: AdapterConfig) =>
  createLinearAdapter({
    apiKey: config.apiKey || config.accessToken || '',
  }),
);

// Register Trello adapter
issueTrackerRegistry.register('TRELLO', (config: AdapterConfig) =>
  createTrelloAdapter({
    apiKey: config.apiKey || '',
    apiToken: config.apiToken || config.accessToken || '',
  }),
);
