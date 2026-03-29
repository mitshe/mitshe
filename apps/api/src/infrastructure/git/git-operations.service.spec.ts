import { Test, TestingModule } from '@nestjs/testing';
import { GitOperationsService } from './git-operations.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../adapters/adapter-factory.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('GitOperationsService', () => {
  let service: GitOperationsService;

  const mockPrismaService = {
    repository: {
      findUnique: jest.fn(),
    },
  };

  const mockAdapterFactory = {
    createGitProviderFromIntegration: jest.fn(),
  };

  const mockEncryptionService = {
    decryptJson: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitOperationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdapterFactoryService, useValue: mockAdapterFactory },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<GitOperationsService>(GitOperationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBranchName', () => {
    it('should replace task key variable', () => {
      const result = service.generateBranchName('feature/{{task.key}}', {
        key: 'PROJ-123',
      });
      expect(result).toBe('feature/PROJ-123');
    });

    it('should replace task title variable', () => {
      const result = service.generateBranchName('feature/{{task.title}}', {
        title: 'Add Login',
      });
      expect(result).toBe('feature/Add-Login');
    });

    it('should replace task title with slug', () => {
      const result = service.generateBranchName('feature/{{task.title|slug}}', {
        title: 'Add User Authentication!',
      });
      expect(result).toBe('feature/add-user-authentication');
    });

    it('should replace task id variable', () => {
      const result = service.generateBranchName('fix/{{task.id}}', {
        id: 'abc123',
      });
      expect(result).toBe('fix/abc123');
    });

    it('should handle multiple variables', () => {
      const result = service.generateBranchName(
        'feature/{{task.key}}-{{task.title|slug}}',
        {
          key: 'PROJ-123',
          title: 'Add User Auth',
        },
      );
      expect(result).toBe('feature/PROJ-123-add-user-auth');
    });

    it('should sanitize branch name', () => {
      const result = service.generateBranchName('feature/{{task.title|slug}}', {
        title: 'Fix bug with special chars: @#$%',
      });
      expect(result).toBe('feature/fix-bug-with-special-chars');
    });

    it('should limit branch name length', () => {
      const result = service.generateBranchName('feature/{{task.title|slug}}', {
        title: 'A'.repeat(200),
      });
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty variables gracefully', () => {
      const result = service.generateBranchName(
        'feature/{{task.key}}-test',
        {},
      );
      // Variable not replaced, curly braces sanitized to dashes
      expect(result).toBe('feature/-task-key-test');
    });
  });

  describe('createWorkDir', () => {
    it('should create a work directory', () => {
      const executionId = 'test-execution-123';
      const workDir = service.createWorkDir(executionId);

      expect(workDir).toContain(executionId);
      expect(fs.existsSync(workDir)).toBe(true);

      // Cleanup
      fs.rmSync(workDir, { recursive: true, force: true });
    });

    it('should return existing directory if already created', () => {
      const executionId = 'test-execution-456';
      const workDir1 = service.createWorkDir(executionId);
      const workDir2 = service.createWorkDir(executionId);

      expect(workDir1).toBe(workDir2);

      // Cleanup
      fs.rmSync(workDir1, { recursive: true, force: true });
    });
  });

  describe('cleanup', () => {
    it('should remove work directory', async () => {
      const executionId = 'test-cleanup-123';
      const workDir = service.createWorkDir(executionId);

      // Create a test file
      fs.writeFileSync(path.join(workDir, 'test.txt'), 'test');

      await service.cleanup(workDir);

      expect(fs.existsSync(workDir)).toBe(false);
    });

    it('should not throw if directory does not exist', async () => {
      const nonExistentDir = path.join(os.tmpdir(), 'non-existent-dir-12345');

      await expect(service.cleanup(nonExistentDir)).resolves.not.toThrow();
    });
  });
});
