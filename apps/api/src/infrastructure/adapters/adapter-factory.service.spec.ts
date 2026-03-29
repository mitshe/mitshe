import { Test, TestingModule } from '@nestjs/testing';
import { AdapterFactoryService } from './adapter-factory.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

describe('AdapterFactoryService', () => {
  let service: AdapterFactoryService;
  const testKey = randomBytes(32).toString('hex');

  const mockPrismaService = {
    integration: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    aICredential: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdapterFactoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return testKey;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AdapterFactoryService>(AdapterFactoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createIssueTracker', () => {
    it('should create JIRA adapter', () => {
      const adapter = service.createIssueTracker('JIRA', {
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'token123',
      });
      expect(adapter).toBeDefined();
      expect(typeof adapter.testConnection).toBe('function');
    });

    it('should create YouTrack adapter', () => {
      const adapter = service.createIssueTracker('YOUTRACK', {
        baseUrl: 'https://test.youtrack.cloud',
        apiToken: 'perm:token',
      });
      expect(adapter).toBeDefined();
    });

    it('should create Linear adapter', () => {
      const adapter = service.createIssueTracker('LINEAR', {
        apiKey: 'lin_api_key',
      });
      expect(adapter).toBeDefined();
    });

    it('should throw for unknown issue tracker', () => {
      expect(() => service.createIssueTracker('UNKNOWN', {})).toThrow(
        'Unknown issue tracker type',
      );
    });
  });

  describe('createGitProvider', () => {
    it('should create GitLab adapter', () => {
      const adapter = service.createGitProvider('GITLAB', {
        baseUrl: 'https://gitlab.com',
        accessToken: 'glpat-token',
      });
      expect(adapter).toBeDefined();
    });

    it('should create GitHub adapter', () => {
      const adapter = service.createGitProvider('GITHUB', {
        accessToken: 'ghp_token',
      });
      expect(adapter).toBeDefined();
    });

    it('should throw for unknown git provider', () => {
      expect(() => service.createGitProvider('UNKNOWN', {})).toThrow(
        'Unknown git provider type',
      );
    });
  });

  describe('createNotificationProvider', () => {
    it('should create Slack adapter with botToken', () => {
      const adapter = service.createNotificationProvider('SLACK', {
        botToken: 'xoxb-token',
      });
      expect(adapter).toBeDefined();
      expect(adapter.getProviderType()).toBe('slack');
    });

    it('should create Slack webhook adapter', () => {
      const adapter = service.createNotificationProvider('SLACK', {
        webhookUrl: 'https://hooks.slack.com/services/xxx',
      });
      expect(adapter).toBeDefined();
    });

    it('should create Discord adapter', () => {
      const adapter = service.createNotificationProvider('DISCORD', {
        webhookUrl: 'https://discord.com/api/webhooks/123/abc',
      });
      expect(adapter).toBeDefined();
      expect(adapter.getProviderType()).toBe('discord');
    });

    it('should create Telegram adapter', () => {
      const adapter = service.createNotificationProvider('TELEGRAM', {
        botToken: '123456789:ABCdef',
      });
      expect(adapter).toBeDefined();
      expect(adapter.getProviderType()).toBe('telegram');
    });

    it('should throw for Teams (not implemented)', () => {
      expect(() => service.createNotificationProvider('TEAMS', {})).toThrow(
        'Teams adapter not implemented',
      );
    });

    it('should throw for unknown notification provider', () => {
      expect(() => service.createNotificationProvider('UNKNOWN', {})).toThrow(
        'Unknown notification provider type',
      );
    });
  });

  describe('createKnowledgeBase', () => {
    it('should create Obsidian adapter', () => {
      const adapter = service.createKnowledgeBase('OBSIDIAN', {
        baseUrl: 'https://127.0.0.1:27124',
        apiToken: 'api-key',
      });
      expect(adapter).toBeDefined();
    });

    it('should throw for unknown knowledge base', () => {
      expect(() => service.createKnowledgeBase('UNKNOWN', {})).toThrow(
        'Unknown knowledge base type',
      );
    });
  });

  describe('createAIProvider', () => {
    it('should create Claude adapter', () => {
      const adapter = service.createAIProvider('CLAUDE', {
        apiKey: 'sk-ant-key',
      });
      expect(adapter).toBeDefined();
    });

    it('should create OpenAI adapter', () => {
      const adapter = service.createAIProvider('OPENAI', {
        apiKey: 'sk-openai-key',
      });
      expect(adapter).toBeDefined();
    });

    it('should create OpenRouter adapter', () => {
      const adapter = service.createAIProvider('OPENROUTER', {
        apiKey: 'sk-or-key',
      });
      expect(adapter).toBeDefined();
    });

    it('should create Gemini adapter', () => {
      const adapter = service.createAIProvider('GEMINI', {
        apiKey: 'gemini-key',
      });
      expect(adapter).toBeDefined();
    });

    it('should create Groq adapter', () => {
      const adapter = service.createAIProvider('GROQ', {
        apiKey: 'groq-key',
      });
      expect(adapter).toBeDefined();
    });

    it('should create Claude Code Local adapter', () => {
      const adapter = service.createAIProvider('CLAUDE_CODE_LOCAL', {
        apiKey: 'local',
      });
      expect(adapter).toBeDefined();
    });

    it('should throw for unknown AI provider', () => {
      expect(() =>
        service.createAIProvider('UNKNOWN', { apiKey: 'key' }),
      ).toThrow('Unknown AI provider type');
    });
  });

  describe('testIntegrationConnection', () => {
    it('should test JIRA connection', async () => {
      const result = await service.testIntegrationConnection('JIRA', {
        baseUrl: 'https://invalid.atlassian.net',
        email: 'test@example.com',
        apiToken: 'invalid-token',
      });
      // Will fail because credentials are invalid
      expect(result.success).toBe(false);
    });

    it('should test Discord connection with invalid URL', async () => {
      const result = await service.testIntegrationConnection('DISCORD', {
        webhookUrl: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Discord webhook URL');
    });

    it('should test Telegram connection with invalid token', async () => {
      const result = await service.testIntegrationConnection('TELEGRAM', {
        botToken: 'invalid',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid bot token format');
    });

    it('should return error for unknown integration type', async () => {
      const result = await service.testIntegrationConnection('UNKNOWN', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown integration type');
    });
  });
});
