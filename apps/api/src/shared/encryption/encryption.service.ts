import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }
    // Key should be 32 bytes (64 hex characters)
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Encrypt a string value
   * Returns { encrypted: Buffer, iv: Buffer }
   */
  encrypt(plaintext: string): { encrypted: Buffer; iv: Buffer } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Append auth tag for GCM
    const authTag = cipher.getAuthTag();

    return {
      encrypted: Buffer.concat([encrypted, authTag]),
      iv,
    };
  }

  /**
   * Decrypt a buffer value
   */
  decrypt(encrypted: Buffer, iv: Buffer): string {
    // Extract auth tag (last 16 bytes)
    const authTag = encrypted.subarray(-16);
    const encryptedData = encrypted.subarray(0, -16);

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Encrypt a JSON object
   */
  encryptJson(data: Record<string, unknown>): {
    encrypted: Buffer;
    iv: Buffer;
  } {
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Decrypt to JSON object
   */
  decryptJson<T = Record<string, unknown>>(encrypted: Buffer, iv: Buffer): T {
    const decrypted = this.decrypt(encrypted, iv);
    return JSON.parse(decrypted) as T;
  }
}
