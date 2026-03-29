import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, WebhookProcessingJob } from '../queues';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { TasksService } from '../../../modules/tasks/services/tasks.service';
import { WorkflowOrchestratorService } from '../../../modules/workflows/engine/workflow-orchestrator.service';

@Processor(QUEUES.WEBHOOK_PROCESSING)
export class WebhookProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly workflowOrchestrator: WorkflowOrchestratorService,
  ) {
    super();
  }

  async process(job: Job<WebhookProcessingJob>): Promise<void> {
    const { type, payload, headers, timestamp } = job.data;

    this.logger.log(`Processing ${type} webhook received at ${timestamp}`);

    try {
      switch (type) {
        case 'jira':
          await this.handleJiraWebhook(payload, headers);
          break;

        case 'gitlab':
          await this.handleGitLabWebhook(payload, headers);
          break;

        case 'github':
          await this.handleGitHubWebhook(payload, headers);
          break;

        case 'clerk':
          await this.handleClerkWebhook(payload, headers);
          break;

        default:
          this.logger.warn(`Unknown webhook type: ${type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing ${type} webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleJiraWebhook(
    payload: Record<string, unknown>,
    _headers: Record<string, string>,
  ): Promise<void> {
    const webhookEvent = payload.webhookEvent as string;
    const organizationId = payload._organizationId as string | undefined;

    this.logger.log(
      `Processing JIRA webhook event: ${webhookEvent} for org: ${organizationId || 'unknown'}`,
    );

    // Parse JIRA event types
    // jira:issue_created, jira:issue_updated, jira:issue_deleted
    // comment_created, comment_updated, comment_deleted

    const issue = payload.issue as Record<string, any>;

    if (!issue) {
      this.logger.warn('No issue in JIRA webhook payload');
      return;
    }

    const issueKey = issue.key;
    const projectKey = issue.fields?.project?.key;

    // Process changelog for component/status changes
    if (webhookEvent === 'jira:issue_updated') {
      const changelog = payload.changelog as Record<string, any>;

      if (changelog?.items) {
        for (const item of changelog.items) {
          // Handle component additions
          if (item.field === 'Component') {
            const addedComponent = item.toString;
            const removedComponent = item.fromString;

            if (addedComponent && !removedComponent) {
              this.logger.log(
                `JIRA issue ${issueKey}: Component "${addedComponent}" added`,
              );

              // Trigger workflows for component addition
              await this.triggerJiraWorkflows(
                organizationId,
                projectKey,
                'jira_component_added',
                {
                  issueKey,
                  issueId: issue.id,
                  summary: issue.fields?.summary,
                  description: issue.fields?.description,
                  status: issue.fields?.status?.name,
                  priority: issue.fields?.priority?.name,
                  assignee: issue.fields?.assignee?.displayName,
                  reporter: issue.fields?.reporter?.displayName,
                  labels: issue.fields?.labels || [],
                  component: addedComponent,
                  projectKey,
                  projectName: issue.fields?.project?.name,
                  issueUrl: issue.self?.replace(
                    '/rest/api/3/issue/',
                    '/browse/',
                  ),
                },
              );
            }
          }

          // Handle status changes
          if (item.field === 'status') {
            this.logger.log(
              `JIRA issue ${issueKey} status changed: ${item.fromString} -> ${item.toString}`,
            );

            await this.triggerJiraWorkflows(
              organizationId,
              projectKey,
              'jira_status_change',
              {
                issueKey,
                issueId: issue.id,
                summary: issue.fields?.summary,
                fromStatus: item.fromString,
                toStatus: item.toString,
                projectKey,
              },
            );
          }

          // Handle label additions
          if (item.field === 'labels') {
            const oldLabels = (item.fromString || '')
              .split(' ')
              .filter(Boolean);
            const newLabels = (item.toString || '').split(' ').filter(Boolean);
            const addedLabels = newLabels.filter((l) => !oldLabels.includes(l));

            for (const addedLabel of addedLabels) {
              this.logger.log(
                `JIRA issue ${issueKey}: Label "${addedLabel}" added`,
              );

              await this.triggerJiraWorkflows(
                organizationId,
                projectKey,
                'jira_label_added',
                {
                  issueKey,
                  issueId: issue.id,
                  summary: issue.fields?.summary,
                  description: issue.fields?.description,
                  status: issue.fields?.status?.name,
                  priority: issue.fields?.priority?.name,
                  assignee: issue.fields?.assignee?.displayName,
                  reporter: issue.fields?.reporter?.displayName,
                  labels: issue.fields?.labels || [],
                  label: addedLabel,
                  components:
                    issue.fields?.components
                      ?.map((c: any) => c.name)
                      .join(', ') || '',
                  projectKey,
                  projectName: issue.fields?.project?.name,
                  issueUrl: issue.self?.replace(
                    '/rest/api/3/issue/',
                    '/browse/',
                  ),
                },
              );
            }
          }
        }
      }
    }

    // Handle issue creation - create task if AI label is present
    if (webhookEvent === 'jira:issue_created') {
      this.logger.log(`JIRA issue created: ${issueKey}`);

      // Create task in DB if organization is known
      if (organizationId) {
        await this.createTaskFromJiraIssue(organizationId, issue, projectKey);
      }

      await this.triggerJiraWorkflows(
        organizationId,
        projectKey,
        'jira_issue_created',
        {
          issueKey,
          issueId: issue.id,
          summary: issue.fields?.summary,
          description: issue.fields?.description,
          status: issue.fields?.status?.name,
          priority: issue.fields?.priority?.name,
          assignee: issue.fields?.assignee?.displayName,
          labels: issue.fields?.labels || [],
          components:
            issue.fields?.components?.map((c: any) => c.name).join(', ') || '',
          projectKey,
          projectName: issue.fields?.project?.name,
        },
      );
    }

    // Handle label additions - create task if AI label is added
    if (webhookEvent === 'jira:issue_updated') {
      const changelog = payload.changelog as Record<string, any>;
      const labelsItem = changelog?.items?.find(
        (item: any) => item.field === 'labels',
      );

      if (labelsItem && organizationId) {
        const oldLabels = (labelsItem.fromString || '')
          .split(' ')
          .filter(Boolean);
        const newLabels = (labelsItem.toString || '')
          .split(' ')
          .filter(Boolean);
        const addedLabels = newLabels.filter(
          (l: string) => !oldLabels.includes(l),
        );

        // Check if AI label was added
        const project = await this.findProjectByJiraKey(
          organizationId,
          projectKey,
        );
        const aiLabel = project?.aiTriggerLabel || 'AI';

        if (addedLabels.includes(aiLabel)) {
          this.logger.log(
            `JIRA issue ${issueKey}: AI label "${aiLabel}" added, creating task`,
          );
          await this.createTaskFromJiraIssue(organizationId, issue, projectKey);
        }
      }
    }

    // Handle linked tasks (existing logic)
    const linkedTasks = await this.prisma.task.findMany({
      where: {
        externalIssueId: issueKey,
      },
    });

    for (const task of linkedTasks) {
      if (webhookEvent === 'jira:issue_updated') {
        const changelog = payload.changelog as Record<string, any>;

        if (changelog?.items) {
          for (const item of changelog.items) {
            if (item.field === 'status') {
              await this.triggerWorkflows(
                task.organizationId,
                'jira_status_change',
                {
                  taskId: task.id,
                  issueKey,
                  fromStatus: item.fromString,
                  toStatus: item.toString,
                },
              );
            }
          }
        }
      }
    }
  }

  /**
   * Trigger JIRA workflows for the given organization
   */
  private async triggerJiraWorkflows(
    organizationId: string | undefined,
    _projectKey: string,
    triggerType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!organizationId) {
      this.logger.warn(
        `Cannot trigger JIRA workflow: missing organizationId. Webhook URL must include organization token.`,
      );
      return;
    }

    try {
      const executionIds = await this.workflowOrchestrator.triggerWorkflows(
        organizationId,
        `trigger:${triggerType}`,
        payload,
      );

      if (executionIds.length > 0) {
        this.logger.log(
          `Triggered ${executionIds.length} workflow(s) for org ${organizationId} on ${triggerType}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to trigger JIRA workflows for ${triggerType}: ${error.message}`,
      );
    }
  }

  private async handleGitLabWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<void> {
    const eventType = headers['x-gitlab-event'];
    const organizationId = payload._organizationId as string | undefined;

    this.logger.log(
      `Processing GitLab webhook event: ${eventType} for org: ${organizationId || 'unknown'}`,
    );

    if (!organizationId) {
      this.logger.warn(
        `Cannot process GitLab webhook: missing organizationId. Webhook URL must include organization token.`,
      );
      return;
    }

    switch (eventType) {
      case 'Merge Request Hook':
        await this.handleGitLabMergeRequest(payload, organizationId);
        break;

      case 'Push Hook':
        await this.handleGitLabPush(payload, organizationId);
        break;

      case 'Pipeline Hook':
        this.handleGitLabPipeline(payload);
        break;

      case 'Note Hook':
        this.handleGitLabNote(payload);
        break;

      default:
        this.logger.log(`Unhandled GitLab event type: ${eventType}`);
    }
  }

  private async handleGitLabMergeRequest(
    payload: Record<string, unknown>,
    organizationId: string,
  ): Promise<void> {
    const mr = payload.object_attributes as Record<string, any>;
    const action = mr?.action;

    this.logger.log(`GitLab MR ${mr?.iid}: ${action} (org: ${organizationId})`);

    // Extract task references from MR title/description
    const taskRefs = this.extractTaskReferences(
      mr?.title + ' ' + mr?.description,
    );

    for (const taskRef of taskRefs) {
      // Find the task within this organization only (security: prevent cross-org access)
      const task = await this.prisma.task.findFirst({
        where: {
          organizationId, // Scope to organization from webhook URL
          OR: [{ id: taskRef }, { externalIssueId: taskRef }],
        },
      });

      if (task) {
        await this.triggerWorkflows(organizationId, 'gitlab_mr_' + action, {
          taskId: task.id,
          mrId: mr?.iid,
          mrUrl: mr?.url,
          action,
        });
      }
    }
  }

  private async handleGitLabPush(
    payload: Record<string, unknown>,
    organizationId: string,
  ): Promise<void> {
    const commits = (payload.commits as any[]) || [];

    for (const commit of commits) {
      const taskRefs = this.extractTaskReferences(commit.message);

      for (const taskRef of taskRefs) {
        // Find the task within this organization only (security: prevent cross-org access)
        const task = await this.prisma.task.findFirst({
          where: {
            organizationId, // Scope to organization from webhook URL
            OR: [{ id: taskRef }, { externalIssueId: taskRef }],
          },
        });

        if (task) {
          await this.triggerWorkflows(organizationId, 'gitlab_commit', {
            taskId: task.id,
            commitSha: commit.id,
            commitMessage: commit.message,
          });
        }
      }
    }
  }

  private handleGitLabPipeline(payload: Record<string, unknown>): void {
    const pipeline = payload.object_attributes as Record<string, any>;
    const status = pipeline?.status;

    this.logger.log(`GitLab Pipeline ${pipeline?.id}: ${status}`);

    // Pipelines can be linked to MRs which link to tasks
    // TODO: Implement pipeline tracking
  }

  private handleGitLabNote(payload: Record<string, unknown>): void {
    // Handle comments on MRs, issues, etc.
    const note = payload.object_attributes as Record<string, any>;

    this.logger.log(`GitLab Note on ${note?.noteable_type}: ${note?.id}`);
  }

  private async handleGitHubWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<void> {
    const eventType = headers['x-github-event'];
    const organizationId = payload._organizationId as string | undefined;

    this.logger.log(
      `Processing GitHub webhook event: ${eventType} for org: ${organizationId || 'unknown'}`,
    );

    if (!organizationId) {
      this.logger.warn(
        `Cannot process GitHub webhook: missing organizationId. Webhook URL must include organization token.`,
      );
      return;
    }

    switch (eventType) {
      case 'pull_request':
        await this.handleGitHubPullRequest(payload, organizationId);
        break;

      case 'push':
        await this.handleGitHubPush(payload, organizationId);
        break;

      case 'issues':
        this.handleGitHubIssue(payload);
        break;

      case 'issue_comment':
        this.handleGitHubIssueComment(payload);
        break;

      default:
        this.logger.log(`Unhandled GitHub event type: ${eventType}`);
    }
  }

  private async handleGitHubPullRequest(
    payload: Record<string, unknown>,
    organizationId: string,
  ): Promise<void> {
    const action = payload.action as string;
    const pr = payload.pull_request as Record<string, any>;

    this.logger.log(
      `GitHub PR #${pr?.number}: ${action} (org: ${organizationId})`,
    );

    const taskRefs = this.extractTaskReferences(pr?.title + ' ' + pr?.body);

    for (const taskRef of taskRefs) {
      // Find the task within this organization only (security: prevent cross-org access)
      const task = await this.prisma.task.findFirst({
        where: {
          organizationId, // Scope to organization from webhook URL
          OR: [{ id: taskRef }, { externalIssueId: taskRef }],
        },
      });

      if (task) {
        await this.triggerWorkflows(organizationId, 'github_pr_' + action, {
          taskId: task.id,
          prNumber: pr?.number,
          prUrl: pr?.html_url,
          action,
        });
      }
    }
  }

  private async handleGitHubPush(
    payload: Record<string, unknown>,
    organizationId: string,
  ): Promise<void> {
    const commits = (payload.commits as any[]) || [];

    for (const commit of commits) {
      const taskRefs = this.extractTaskReferences(commit.message);

      for (const taskRef of taskRefs) {
        // Find the task within this organization only (security: prevent cross-org access)
        const task = await this.prisma.task.findFirst({
          where: {
            organizationId, // Scope to organization from webhook URL
            OR: [{ id: taskRef }, { externalIssueId: taskRef }],
          },
        });

        if (task) {
          await this.triggerWorkflows(organizationId, 'github_commit', {
            taskId: task.id,
            commitSha: commit.id,
            commitMessage: commit.message,
          });
        }
      }
    }
  }

  private handleGitHubIssue(payload: Record<string, unknown>): void {
    const action = payload.action as string;
    const issue = payload.issue as Record<string, any>;

    this.logger.log(`GitHub Issue #${issue?.number}: ${action}`);

    // TODO: Handle GitHub issue syncing
  }

  private handleGitHubIssueComment(payload: Record<string, unknown>): void {
    const action = payload.action as string;
    // Comment data available in payload.comment if needed
    this.logger.log(`GitHub Issue Comment: ${action}`);

    // TODO: Handle GitHub issue comments
  }

  private async handleClerkWebhook(
    payload: Record<string, unknown>,
    _headers: Record<string, string>,
  ): Promise<void> {
    const eventType = payload.type as string;

    this.logger.log(`Processing Clerk webhook event: ${eventType}`);

    switch (eventType) {
      case 'organization.created':
        await this.handleOrganizationCreated(
          payload.data as Record<string, any>,
        );
        break;

      case 'organization.deleted':
        this.handleOrganizationDeleted(payload.data as Record<string, any>);
        break;

      case 'organizationMembership.created':
        this.handleMembershipCreated(payload.data as Record<string, any>);
        break;

      default:
        this.logger.log(`Unhandled Clerk event type: ${eventType}`);
    }
  }

  private async handleOrganizationCreated(
    data: Record<string, any>,
  ): Promise<void> {
    const orgId = data.id;
    const orgName = data.name;

    this.logger.log(`Organization created: ${orgName} (${orgId})`);

    // Create organization record in our database
    await this.prisma.organization.upsert({
      where: { clerkId: orgId },
      update: { name: orgName },
      create: {
        clerkId: orgId,
        name: orgName,
      },
    });
  }

  private handleOrganizationDeleted(data: Record<string, any>): void {
    const orgId = data.id;

    this.logger.log(`Organization deleted: ${orgId}`);

    // Soft delete or archive organization data
    // For now, we'll just log it
  }

  private handleMembershipCreated(data: Record<string, any>): void {
    const orgId = data.organization?.id;
    const userId = data.public_user_data?.user_id;

    this.logger.log(`User ${userId} added to organization ${orgId}`);
  }

  private async triggerWorkflows(
    organizationId: string,
    triggerType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Use workflow engine to trigger matching workflows
      const executionIds = await this.workflowOrchestrator.triggerWorkflows(
        organizationId,
        `trigger:${triggerType}`,
        payload,
      );

      if (executionIds.length > 0) {
        this.logger.log(
          `Triggered ${executionIds.length} workflow(s) for event ${triggerType}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to trigger workflows for ${triggerType}: ${error.message}`,
      );
    }
  }

  private extractTaskReferences(text: string): string[] {
    if (!text) return [];

    const refs: string[] = [];

    // Match patterns like TASK-123, #123, task/abc123
    const patterns = [
      /\b([A-Z]+-\d+)\b/g, // JIRA-style: PROJ-123
      /#(\d+)\b/g, // GitHub-style: #123
      /\btask\/([a-z0-9]+)\b/gi, // Custom: task/abc123
      /\[([A-Z]+-\d+)\]/g, // Bracketed: [PROJ-123]
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        refs.push(match[1]);
      }
    }

    return [...new Set(refs)]; // Dedupe
  }

  /**
   * Find project by JIRA project key
   */
  private async findProjectByJiraKey(
    organizationId: string,
    projectKey: string,
  ) {
    return this.prisma.project.findFirst({
      where: {
        organizationId,
        issueTrackerProject: projectKey,
      },
    });
  }

  /**
   * Create a task from JIRA issue data
   */
  private async createTaskFromJiraIssue(
    organizationId: string,
    issue: Record<string, any>,
    projectKey: string,
  ): Promise<void> {
    const issueKey = issue.key;
    const summary = issue.fields?.summary;
    const description = issue.fields?.description;
    const labels = issue.fields?.labels || [];

    // Check if task already exists
    const existingTask = await this.prisma.task.findFirst({
      where: {
        organizationId,
        externalIssueId: issueKey,
      },
    });

    if (existingTask) {
      this.logger.log(`Task already exists for JIRA issue ${issueKey}`);
      return;
    }

    // Find project by JIRA project key
    const project = await this.findProjectByJiraKey(organizationId, projectKey);
    const aiLabel = project?.aiTriggerLabel || 'AI';

    // Only create task if AI label is present
    if (!labels.includes(aiLabel)) {
      this.logger.debug(
        `JIRA issue ${issueKey} does not have AI label "${aiLabel}", skipping task creation`,
      );
      return;
    }

    // Build JIRA issue URL
    // Issue self URL is like: https://your-domain.atlassian.net/rest/api/3/issue/10001
    // We need: https://your-domain.atlassian.net/browse/PROJ-123
    let issueUrl = '';
    if (issue.self) {
      const baseUrl = issue.self.split('/rest/')[0];
      issueUrl = `${baseUrl}/browse/${issueKey}`;
    }

    // Convert JIRA description (ADF format) to plain text
    let descriptionText = '';
    if (description) {
      if (typeof description === 'string') {
        descriptionText = description;
      } else if (description.content) {
        // ADF format - extract text content
        descriptionText = this.extractTextFromADF(description);
      }
    }

    // Create the task
    const task = await this.prisma.task.create({
      data: {
        organizationId,
        projectId: project?.id || null,
        title: summary || `JIRA Issue ${issueKey}`,
        description: descriptionText || null,
        externalSource: 'JIRA',
        externalIssueId: issueKey,
        externalIssueUrl: issueUrl || null,
        externalData: issue as any,
        externalStatus: issue.fields?.status?.name || null,
        priority: issue.fields?.priority?.name || null,
        createdBy: 'webhook',
        agentLogs: [],
      },
    });

    this.logger.log(
      `Created task ${task.id} from JIRA issue ${issueKey} (org: ${organizationId})`,
    );
  }

  /**
   * Extract plain text from Atlassian Document Format (ADF)
   */
  private extractTextFromADF(adf: Record<string, any>): string {
    if (!adf || !adf.content) {
      return '';
    }

    const extractFromNode = (node: any): string => {
      if (!node) return '';

      if (node.type === 'text') {
        return node.text || '';
      }

      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractFromNode).join('');
      }

      return '';
    };

    const lines: string[] = [];
    for (const node of adf.content) {
      const text = extractFromNode(node);
      if (text) {
        lines.push(text);
      }
    }

    return lines.join('\n');
  }
}
