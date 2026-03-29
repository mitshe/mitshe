import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';
import {
  GitProvider,
  IntegrationStatus,
  IntegrationType,
} from '@prisma/client';

describe('RepositoriesService', () => {
  let service: RepositoriesService;

  const mockPrismaService = {
    repository: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    integration: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAdapterFactory = {
    createGitProviderFromIntegration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdapterFactoryService, useValue: mockAdapterFactory },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all repositories for an organization', async () => {
      const mockRepos = [
        {
          id: 'repo-1',
          name: 'frontend',
          fullPath: 'org/frontend',
          provider: GitProvider.GITLAB,
          isActive: true,
        },
        {
          id: 'repo-2',
          name: 'backend',
          fullPath: 'org/backend',
          provider: GitProvider.GITHUB,
          isActive: false,
        },
      ];

      mockPrismaService.repository.findMany.mockResolvedValue(mockRepos);

      const result = await service.findAll('org-123');

      expect(result).toEqual(mockRepos);
      expect(mockPrismaService.repository.findMany).toHaveBeenCalled();
    });

    it('should filter by active status when provided', async () => {
      const mockRepos = [
        {
          id: 'repo-1',
          name: 'frontend',
          isActive: true,
        },
      ];

      mockPrismaService.repository.findMany.mockResolvedValue(mockRepos);

      await service.findAll('org-123', { isActive: true });

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123',
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a repository by id', async () => {
      const mockRepo = {
        id: 'repo-1',
        name: 'frontend',
        organizationId: 'org-123',
      };

      mockPrismaService.repository.findFirst.mockResolvedValue(mockRepo);

      const result = await service.findOne('org-123', 'repo-1');

      expect(result).toEqual(mockRepo);
      expect(mockPrismaService.repository.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'repo-1', organizationId: 'org-123' },
        }),
      );
    });

    it('should throw NotFoundException for non-existent repository', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(null);

      await expect(service.findOne('org-123', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update repository properties', async () => {
      const mockRepo = {
        id: 'repo-1',
        name: 'frontend',
        organizationId: 'org-123',
        isActive: true,
        branchPattern: 'feature/{{task.key}}',
      };

      mockPrismaService.repository.findFirst.mockResolvedValue(mockRepo);
      mockPrismaService.repository.update.mockResolvedValue({
        ...mockRepo,
        isActive: false,
        branchPattern: 'fix/{{task.key}}',
      });

      const result = await service.update('org-123', 'repo-1', {
        isActive: false,
        branchPattern: 'fix/{{task.key}}',
      });

      expect(result.isActive).toBe(false);
      expect(result.branchPattern).toBe('fix/{{task.key}}');
    });

    it('should throw NotFoundException for non-existent repository', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(null);

      await expect(
        service.update('org-123', 'non-existent', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple repositories', async () => {
      mockPrismaService.repository.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdate('org-123', {
        ids: ['repo-1', 'repo-2', 'repo-3'],
        isActive: true,
      });

      expect(result.updated).toBe(3);
      expect(mockPrismaService.repository.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['repo-1', 'repo-2', 'repo-3'] },
          organizationId: 'org-123',
        },
        data: {
          isActive: true,
        },
      });
    });

    it('should handle empty ids array', async () => {
      mockPrismaService.repository.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.bulkUpdate('org-123', {
        ids: [],
        isActive: true,
      });

      expect(result.updated).toBe(0);
    });
  });

  describe('syncFromIntegration', () => {
    it('should sync repositories from a Git integration', async () => {
      const mockIntegration = {
        id: 'int-1',
        organizationId: 'org-123',
        type: IntegrationType.GITLAB,
        status: IntegrationStatus.CONNECTED,
      };

      const mockAdapter = {
        listRepositories: jest.fn().mockResolvedValue([
          {
            id: 'ext-1',
            name: 'project-1',
            fullName: 'group/project-1',
            description: 'Description 1',
            defaultBranch: 'main',
            cloneUrl: 'https://gitlab.com/group/project-1.git',
            webUrl: 'https://gitlab.com/group/project-1',
          },
        ]),
      };

      mockPrismaService.integration.findFirst.mockResolvedValue(
        mockIntegration,
      );
      mockAdapterFactory.createGitProviderFromIntegration.mockResolvedValue(
        mockAdapter,
      );
      mockPrismaService.repository.findFirst.mockResolvedValue(null); // No existing repo
      mockPrismaService.repository.create.mockImplementation((args) => ({
        ...args.data,
        id: 'repo-created',
      }));
      mockPrismaService.integration.update.mockResolvedValue(mockIntegration);

      const result = await service.syncFromIntegration('org-123', 'int-1');

      expect(result.synced).toBe(1);
      expect(mockAdapter.listRepositories).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-connected integrations', async () => {
      mockPrismaService.integration.findFirst.mockResolvedValue(null);

      await expect(
        service.syncFromIntegration('org-123', 'int-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
