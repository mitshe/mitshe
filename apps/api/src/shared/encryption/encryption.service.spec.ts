import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { randomBytes } from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  // Generate a valid 32-byte (256-bit) key for AES-256
  const testKey = randomBytes(32).toString('hex');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') {
                return testKey;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'Hello, World! This is a secret message.';

      const { encrypted, iv } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should generate different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same message';

      const result1 = service.encrypt(plaintext);
      const result2 = service.encrypt(plaintext);

      // IVs should be different
      expect(result1.iv.equals(result2.iv)).toBe(false);
      // Encrypted data should be different
      expect(result1.encrypted.equals(result2.encrypted)).toBe(false);
    });

    it('should encrypt and decrypt empty string', () => {
      const plaintext = '';

      const { encrypted, iv } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe('');
    });

    it('should encrypt and decrypt long strings', () => {
      const plaintext = 'A'.repeat(10000);

      const { encrypted, iv } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 Привет мир';

      const { encrypted, iv } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';

      const { encrypted, iv } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong IV', () => {
      const plaintext = 'Secret message';
      const { encrypted } = service.encrypt(plaintext);
      const wrongIv = randomBytes(16);

      expect(() => {
        service.decrypt(encrypted, wrongIv);
      }).toThrow();
    });

    it('should fail to decrypt tampered ciphertext', () => {
      const plaintext = 'Secret message';
      const { encrypted, iv } = service.encrypt(plaintext);

      // Tamper with the encrypted data
      encrypted[0] = encrypted[0] ^ 0xff;

      expect(() => {
        service.decrypt(encrypted, iv);
      }).toThrow();
    });
  });

  describe('encryptJson/decryptJson', () => {
    it('should encrypt and decrypt a simple object', () => {
      const data = { name: 'John', age: 30 };

      const { encrypted, iv } = service.encryptJson(data);
      const decrypted = service.decryptJson(encrypted, iv);

      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt a complex nested object', () => {
      const data = {
        user: {
          id: '123',
          profile: {
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
        },
        permissions: ['read', 'write', 'admin'],
        settings: {
          notifications: true,
          theme: 'dark',
        },
      };

      const { encrypted, iv } = service.encryptJson(data);
      const decrypted = service.decryptJson(encrypted, iv);

      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt API credentials', () => {
      const credentials = {
        apiKey: 'sk-test-1234567890abcdefghijklmnop',
        apiSecret: 'super_secret_value_123!@#',
        refreshToken: 'rt_abcdefghijklmnopqrstuvwxyz',
        expiresAt: '2024-12-31T23:59:59Z',
      };

      const { encrypted, iv } = service.encryptJson(credentials);
      const decrypted = service.decryptJson(encrypted, iv);

      expect(decrypted).toEqual(credentials);
    });

    it('should encrypt and decrypt an empty object', () => {
      const data = {};

      const { encrypted, iv } = service.encryptJson(data);
      const decrypted = service.decryptJson(encrypted, iv);

      expect(decrypted).toEqual({});
    });

    it('should encrypt and decrypt an array', () => {
      const data = { items: [1, 2, 3, 4, 5] };

      const { encrypted, iv } = service.encryptJson(data);
      const decrypted = service.decryptJson(encrypted, iv);

      expect(decrypted).toEqual(data);
    });

    it('should handle null values in objects', () => {
      const data = {
        value: null,
        nested: { also: null },
      };

      const { encrypted, iv } = service.encryptJson(data);
      const decrypted = service.decryptJson(encrypted, iv);

      expect(decrypted).toEqual(data);
    });
  });

  describe('error handling', () => {
    it('should throw error if ENCRYPTION_KEY is not configured', async () => {
      const module = Test.createTestingModule({
        providers: [
          EncryptionService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      });

      await expect(module.compile()).rejects.toThrow(
        'ENCRYPTION_KEY is not configured',
      );
    });
  });
});
