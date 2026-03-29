/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let prisma: jest.Mocked<PrismaService>;

  const mockOrganizationId = 'org-123';
  const mockApiKeyId = 'key-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: PrismaService,
          useValue: {
            apiKey: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an API key with Argon2 hash', async () => {
      const dto = { name: 'Test API Key' };
      const mockApiKey = {
        id: mockApiKeyId,
        name: dto.name,
        prefix: 'atk_abcd1234',
        hashedKey: '$argon2id$...',
        organizationId: mockOrganizationId,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      };

      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      const result = await service.create(mockOrganizationId, dto);

      expect(result.id).toBe(mockApiKeyId);
      expect(result.name).toBe(dto.name);
      expect(result.prefix).toMatch(/^atk_/);
      expect(result.key).toMatch(/^atk_[a-f0-9]{64}$/);
      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrganizationId,
            name: dto.name,
          }),
        }),
      );
    });

    it('should create API key with expiration date', async () => {
      const expiresAt = new Date('2025-12-31');
      const dto = { name: 'Expiring Key', expiresAt: expiresAt.toISOString() };

      (prisma.apiKey.create as jest.Mock).mockResolvedValue({
        id: mockApiKeyId,
        name: dto.name,
        prefix: 'atk_abcd1234',
        hashedKey: '$argon2id$...',
        organizationId: mockOrganizationId,
        lastUsedAt: null,
        expiresAt,
        createdAt: new Date(),
      });

      const result = await service.create(mockOrganizationId, dto);

      expect(result.expiresAt).toEqual(expiresAt);
    });

    it('should generate unique keys for multiple creations', async () => {
      const dto = { name: 'Test Key' };

      (prisma.apiKey.create as jest.Mock).mockImplementation(({ data }) => ({
        id: 'key-' + Math.random(),
        ...data,
        createdAt: new Date(),
      }));

      const key1 = await service.create(mockOrganizationId, dto);
      const key2 = await service.create(mockOrganizationId, dto);

      expect(key1.key).not.toBe(key2.key);
    });
  });

  describe('findAll', () => {
    it('should return all API keys for organization (without hashed keys)', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Key 1',
          prefix: 'atk_1234',
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date(),
        },
        {
          id: 'key-2',
          name: 'Key 2',
          prefix: 'atk_5678',
          lastUsedAt: new Date(),
          expiresAt: null,
          createdAt: new Date(),
        },
      ];

      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue(mockKeys);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('hashedKey');
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrganizationId },
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete an API key', async () => {
      const mockKey = {
        id: mockApiKeyId,
        organizationId: mockOrganizationId,
      };

      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(mockKey);
      (prisma.apiKey.delete as jest.Mock).mockResolvedValue(mockKey);

      await service.remove(mockOrganizationId, mockApiKeyId);

      expect(prisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: mockApiKeyId },
      });
    });

    it('should throw NotFoundException if key not found', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.remove(mockOrganizationId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not delete key from different organization', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('other-org', mockApiKeyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateKey', () => {
    it('should validate a valid Argon2 hashed key', async () => {
      const plainKey = 'atk_' + '0'.repeat(64);
      const hashedKey = await argon2.hash(plainKey, { type: argon2.argon2id });

      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([
        {
          id: mockApiKeyId,
          prefix: plainKey.substring(0, 12),
          hashedKey,
          organizationId: mockOrganizationId,
          expiresAt: null,
        },
      ]);
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

      const result = await service.validateKey(plainKey);

      expect(result).toBe(mockOrganizationId);
    });

    it('should validate and migrate legacy SHA256 key to Argon2', async () => {
      const plainKey = 'atk_' + 'a'.repeat(64);
      const sha256Hash = crypto
        .createHash('sha256')
        .update(plainKey)
        .digest('hex');

      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([
        {
          id: mockApiKeyId,
          prefix: plainKey.substring(0, 12),
          hashedKey: sha256Hash, // Legacy SHA256 hash
          organizationId: mockOrganizationId,
          expiresAt: null,
        },
      ]);
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

      const result = await service.validateKey(plainKey);

      expect(result).toBe(mockOrganizationId);
      // Should migrate to Argon2
      expect(prisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockApiKeyId },
          data: expect.objectContaining({
            hashedKey: expect.stringMatching(/^\$argon2/),
          }),
        }),
      );
    });

    it('should return null for invalid key', async () => {
      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.validateKey('atk_invalid');

      expect(result).toBeNull();
    });

    it('should return null for expired key', async () => {
      const plainKey = 'atk_' + 'b'.repeat(64);
      // Hash the key to verify the test setup (key exists but expired)
      await argon2.hash(plainKey, { type: argon2.argon2id });

      // Key is expired - won't be returned by findMany due to filter
      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.validateKey(plainKey);

      expect(result).toBeNull();
    });

    it('should update lastUsedAt on successful validation', async () => {
      const plainKey = 'atk_' + 'c'.repeat(64);
      const hashedKey = await argon2.hash(plainKey, { type: argon2.argon2id });

      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([
        {
          id: mockApiKeyId,
          prefix: plainKey.substring(0, 12),
          hashedKey,
          organizationId: mockOrganizationId,
          expiresAt: null,
        },
      ]);
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

      await service.validateKey(plainKey);

      expect(prisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockApiKeyId },
          data: expect.objectContaining({
            lastUsedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should handle multiple keys with same prefix', async () => {
      const plainKey1 =
        'atk_sameprefix1234567890abcdef0000000000000000000000000000000000';
      const plainKey2 =
        'atk_sameprefix1234567890abcdef1111111111111111111111111111111111';
      const hashedKey1 = await argon2.hash(plainKey1, {
        type: argon2.argon2id,
      });
      const hashedKey2 = await argon2.hash(plainKey2, {
        type: argon2.argon2id,
      });

      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'key-1',
          prefix: plainKey1.substring(0, 12),
          hashedKey: hashedKey1,
          organizationId: 'org-1',
          expiresAt: null,
        },
        {
          id: 'key-2',
          prefix: plainKey2.substring(0, 12),
          hashedKey: hashedKey2,
          organizationId: 'org-2',
          expiresAt: null,
        },
      ]);
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

      const result1 = await service.validateKey(plainKey1);
      const result2 = await service.validateKey(plainKey2);

      expect(result1).toBe('org-1');
      expect(result2).toBe('org-2');
    });
  });
});
