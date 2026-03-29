/**
 * Adapter Registrations Index
 *
 * Import this file to ensure all adapters are registered with the registry.
 * This should be imported early in the application bootstrap.
 */

import './issue-tracker.registrations';
import './git-provider.registrations';
import './notification.registrations';
import './ai-provider.registrations';
import './knowledge-base.registrations';

export * from '../adapter-registry';
