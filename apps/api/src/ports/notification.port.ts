/**
 * Port for notification integrations (Slack, Teams, Email)
 *
 * ISP-compliant: Core notification interface + optional capability interfaces
 */
export interface NotificationRecipient {
  type: 'user' | 'channel' | 'email' | 'webhook';
  id: string; // Slack user ID, channel ID, email address, or webhook URL
  name?: string; // Display name for logging
}

export interface NotificationMessage {
  title: string;
  body: string;
  url?: string; // Link to related resource
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, string>;
  attachments?: NotificationAttachment[];
}

export interface NotificationAttachment {
  type: 'file' | 'image' | 'code';
  title?: string;
  content: string; // URL for file/image, code content for code
  language?: string; // For code attachments
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  timestamp?: string;
  error?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  email?: string;
}

/**
 * Core notification port - all notification providers must implement this
 */
export interface NotificationPort {
  /**
   * Provider type identifier
   */
  getProviderType(): 'slack' | 'teams' | 'email' | 'discord' | 'telegram';

  /**
   * Test connection
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * Send a notification
   */
  send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<NotificationResult>;

  /**
   * Send notification to multiple recipients
   */
  sendBatch(
    recipients: NotificationRecipient[],
    message: NotificationMessage,
  ): Promise<NotificationResult[]>;

  /**
   * Check if the provider is configured
   */
  isConfigured(): Promise<boolean>;

  /**
   * Get provider name for logging
   */
  getProviderName(): string;
}

/**
 * Optional capability: Channel listing (Slack, Teams, Discord)
 * Use type guard `hasChannelSupport()` to check before calling
 */
export interface ChannelAwareNotificationPort extends NotificationPort {
  listChannels(): Promise<SlackChannel[]>;
}

/**
 * Optional capability: User search (Slack, Teams)
 * Use type guard `hasUserSearch()` to check before calling
 */
export interface UserSearchableNotificationPort extends NotificationPort {
  searchUsers(query: string): Promise<SlackUser[]>;
}

/**
 * Full-featured notification port with all capabilities
 */
export interface RichNotificationPort extends ChannelAwareNotificationPort, UserSearchableNotificationPort {}

// Type guards for checking capabilities
export function hasChannelSupport(port: NotificationPort): port is ChannelAwareNotificationPort {
  return 'listChannels' in port && typeof (port as ChannelAwareNotificationPort).listChannels === 'function';
}

export function hasUserSearch(port: NotificationPort): port is UserSearchableNotificationPort {
  return 'searchUsers' in port && typeof (port as UserSearchableNotificationPort).searchUsers === 'function';
}

export const NOTIFICATION_PORT = Symbol('NotificationPort');
