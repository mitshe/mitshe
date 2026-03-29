import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { AdapterFactoryService } from '../../../infrastructure/adapters/adapter-factory.service';
import { JiraAdapter } from '../../../infrastructure/adapters/issue-tracker/jira.adapter';
import { JiraImportPreview } from '../dto/task-import.dto';
import { Prisma } from '@prisma/client';

interface ParsedJiraUrl {
  baseUrl: string;
  issueKey: string;
}

@Injectable()
export class TaskImportService {
  private readonly logger = new Logger(TaskImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactoryService,
  ) {}

  /**
   * Parse a Jira issue URL to extract base URL and issue key
   */
  parseJiraUrl(url: string): ParsedJiraUrl {
    // Pattern: https://xxx.atlassian.net/browse/KEY-123
    // Or: https://jira.company.com/browse/KEY-123
    const pattern = /^(https?:\/\/[^/]+)\/browse\/([A-Z][A-Z0-9]*-\d+)/i;
    const match = url.match(pattern);

    if (!match) {
      throw new BadRequestException(
        'Invalid Jira URL. Expected format: https://xxx.atlassian.net/browse/KEY-123',
      );
    }

    return {
      baseUrl: match[1],
      issueKey: match[2].toUpperCase(),
    };
  }

  /**
   * Get preview of a Jira issue before importing
   */
  async getImportPreview(
    organizationId: string,
    url: string,
  ): Promise<JiraImportPreview> {
    const { baseUrl, issueKey } = this.parseJiraUrl(url);

    // Check if we have a Jira integration for this organization
    const jiraAdapter = await this.getJiraAdapterForUrl(
      organizationId,
      baseUrl,
    );

    if (!jiraAdapter) {
      throw new BadRequestException(
        `No Jira integration found for ${baseUrl}. Please configure Jira integration first.`,
      );
    }

    try {
      const { issue, raw } = await jiraAdapter.getRawIssue(issueKey);

      return {
        source: 'JIRA',
        issueKey: issue.key,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority !== undefined ? issue.priority : null,
        issueType: issue.issueType,
        assignee: issue.assignee,
        reporter: issue.reporter !== undefined ? issue.reporter : null,
        labels: issue.labels,
        components: (raw.components as any[]) || [],
        project: raw.project as { key: string; name: string },
        url: issue.url,
        created: issue.createdAt,
        updated: issue.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Jira issue: ${error.message}`);
      throw new BadRequestException(`Failed to fetch issue: ${error.message}`);
    }
  }

  /**
   * Import a Jira issue as a task
   */
  async importFromJira(
    organizationId: string,
    userId: string,
    url: string,
    projectId?: string,
  ) {
    const { baseUrl, issueKey } = this.parseJiraUrl(url);

    // Check for existing import
    const existing = await this.prisma.task.findFirst({
      where: {
        organizationId,
        externalIssueId: issueKey,
        externalSource: 'JIRA',
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Issue ${issueKey} has already been imported as task ${existing.id}`,
      );
    }

    // Verify project if specified
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, organizationId },
      });
      if (!project) {
        throw new NotFoundException(`Project ${projectId} not found`);
      }
    }

    // Get Jira adapter and fetch issue
    const jiraAdapter = await this.getJiraAdapterForUrl(
      organizationId,
      baseUrl,
    );

    if (!jiraAdapter) {
      throw new BadRequestException(
        `No Jira integration found for ${baseUrl}. Please configure Jira integration first.`,
      );
    }

    const { issue, raw } = await jiraAdapter.getRawIssue(issueKey);

    // Create task with full Jira data
    const task = await this.prisma.task.create({
      data: {
        organizationId,
        projectId,
        title: issue.title,
        description: issue.description,
        externalSource: 'JIRA',
        externalIssueId: issue.key,
        externalIssueUrl: issue.url,
        externalData: raw as Prisma.InputJsonValue,
        externalStatus: issue.status, // Status from Jira (e.g., "To Do", "In Progress")
        createdBy: userId,
        agentLogs: [],
      },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
      },
    });

    this.logger.log(`Imported Jira issue ${issueKey} as task ${task.id}`);

    return task;
  }

  /**
   * Refresh external data for an imported task
   */
  async refreshExternalData(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (!task.externalSource || !task.externalIssueUrl) {
      throw new BadRequestException('Task has no external source to refresh');
    }

    if (task.externalSource === 'JIRA') {
      const { baseUrl, issueKey } = this.parseJiraUrl(task.externalIssueUrl);
      const jiraAdapter = await this.getJiraAdapterForUrl(
        organizationId,
        baseUrl,
      );

      if (!jiraAdapter) {
        throw new BadRequestException('Jira integration no longer configured');
      }

      const { issue, raw } = await jiraAdapter.getRawIssue(issueKey);

      return this.prisma.task.update({
        where: { id: taskId },
        data: {
          title: issue.title,
          description: issue.description,
          externalData: raw as Prisma.InputJsonValue,
          externalStatus: issue.status, // Sync status from Jira
        },
        include: {
          project: {
            select: { id: true, name: true, key: true },
          },
        },
      });
    }

    throw new BadRequestException(
      `Unsupported external source: ${task.externalSource}`,
    );
  }

  /**
   * Get Jira adapter that matches the URL's base domain
   */
  private async getJiraAdapterForUrl(
    organizationId: string,
    _baseUrl: string,
  ): Promise<JiraAdapter | null> {
    // TODO: In a more sophisticated implementation, match by _baseUrl
    // Get all Jira integrations for this org
    const integration = await this.prisma.integration.findFirst({
      where: {
        organizationId,
        type: 'JIRA',
        status: 'CONNECTED',
      },
    });

    if (!integration) {
      return null;
    }

    // For now, we just use the default Jira adapter
    const adapter =
      await this.adapterFactory.getDefaultIssueTracker(organizationId);

    if (!adapter || adapter.getProviderType() !== 'jira') {
      return null;
    }

    return adapter as JiraAdapter;
  }
}
