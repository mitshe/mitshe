import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, TaskProcessingJob } from '../queues';
import { TasksService } from '../../../modules/tasks/services/tasks.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { AdapterFactoryService } from '../../adapters/adapter-factory.service';
import { Message } from '../../../ports/ai-provider.port';

@Processor(QUEUES.TASK_PROCESSING)
export class TaskProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessingProcessor.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly eventsGateway: EventsGateway,
    private readonly adapterFactory: AdapterFactoryService,
  ) {
    super();
  }

  async process(job: Job<TaskProcessingJob>): Promise<void> {
    const { type, taskId, organizationId, payload } = job.data;

    this.logger.log(`Processing task job: ${type} for task ${taskId}`);

    try {
      switch (type) {
        case 'analyze':
          await this.handleAnalyze(taskId, organizationId);
          break;

        case 'process':
          await this.handleProcess(taskId, organizationId, payload);
          break;

        case 'complete':
          await this.handleComplete(taskId, organizationId, payload);
          break;

        case 'fail':
          await this.handleFail(
            taskId,
            organizationId,
            payload?.reason as string,
          );
          break;

        default:
          this.logger.warn(`Unknown job type: ${type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing task ${taskId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleAnalyze(
    taskId: string,
    organizationId: string,
  ): Promise<void> {
    // Emit status update
    this.eventsGateway.emitTaskUpdate(organizationId, {
      taskId,
      status: 'analyzing',
      message: 'AI is analyzing the task...',
    });

    // Get AI provider
    const aiProvider =
      await this.adapterFactory.getDefaultAIProvider(organizationId);

    if (!aiProvider) {
      this.logger.warn(
        `No AI provider configured for organization ${organizationId}`,
      );
      await this.tasksService.addAgentLog(organizationId, taskId, {
        agentName: 'Analyzer',
        action: 'No AI provider configured - skipping AI analysis',
        details: { canAutomate: false },
      });
      return;
    }

    // Get task details
    const task = await this.tasksService.findOne(organizationId, taskId);

    // Build analysis prompt
    const messages: Message[] = [
      {
        role: 'user',
        content: `Analyze the following task and determine the best approach to solve it:

**Title:** ${task.title}

**Description:** ${task.description || 'No description provided'}

${task.externalIssueUrl ? `**External Issue:** ${task.externalIssueUrl}` : ''}

Please provide:
1. A brief summary of the task requirements
2. Whether this task can be automated
3. Suggested approach (create merge request, add comment, or requires manual intervention)
4. Any potential risks or considerations

Respond in JSON format:
{
  "summary": "string",
  "canAutomate": boolean,
  "suggestedApproach": "merge_request" | "comment" | "manual_intervention",
  "confidence": number (0-1),
  "considerations": ["string"]
}`,
      },
    ];

    try {
      const response = await aiProvider.complete(messages, {
        systemPrompt:
          'You are an expert software development AI assistant. Analyze tasks and provide structured recommendations.',
        maxTokens: 1000,
        temperature: 0.3,
      });

      // Parse AI response
      let analysisResult: {
        summary?: string;
        canAutomate?: boolean;
        suggestedApproach?: string;
        confidence?: number;
        considerations?: string[];
      } = {};

      try {
        // Try to extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse AI analysis response: ${parseError.message}`,
        );
        analysisResult = {
          summary: response.content,
          canAutomate: true,
          confidence: 0.5,
        };
      }

      // Log the analysis
      this.eventsGateway.emitAgentLog(organizationId, taskId, {
        agentName: 'Analyzer',
        action: 'Completed AI analysis',
        details: {
          canAutomate: analysisResult.canAutomate ?? true,
          suggestedApproach: analysisResult.suggestedApproach,
          confidence: analysisResult.confidence,
          summary: analysisResult.summary,
          tokensUsed: response.tokensUsed,
        },
      });

      await this.tasksService.addAgentLog(organizationId, taskId, {
        agentName: 'Analyzer',
        action: 'Completed AI analysis',
        details: {
          canAutomate: analysisResult.canAutomate ?? true,
          suggestedApproach: analysisResult.suggestedApproach,
          confidence: analysisResult.confidence,
          summary: analysisResult.summary,
        },
      });
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);

      await this.tasksService.addAgentLog(organizationId, taskId, {
        agentName: 'Analyzer',
        action: 'AI analysis failed',
        details: { error: error.message },
      });

      throw error;
    }
  }

  private async handleProcess(
    taskId: string,
    organizationId: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    // Emit status update
    this.eventsGateway.emitTaskUpdate(organizationId, {
      taskId,
      status: 'in_progress',
      message: 'AI agents are working on the task...',
      progress: 0,
    });

    // Get AI provider
    const aiProvider =
      await this.adapterFactory.getDefaultAIProvider(organizationId);

    if (!aiProvider) {
      this.logger.warn(
        `No AI provider configured for organization ${organizationId}`,
      );
      // Fall back to simple completion
      await this.tasksService.addAgentLog(organizationId, taskId, {
        agentName: 'Processor',
        action: 'No AI provider configured - cannot process automatically',
      });
      throw new Error('No AI provider configured');
    }

    // Get task details
    const task = await this.tasksService.findOne(organizationId, taskId);

    // Process in steps with AI
    const steps = [
      { name: 'Research', prompt: 'research' },
      { name: 'Planning', prompt: 'plan' },
      { name: 'Implementation', prompt: 'implement' },
      { name: 'Review', prompt: 'review' },
    ];

    const conversationHistory: Message[] = [];
    let lastResult = '';

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = Math.round(((i + 1) / steps.length) * 100);

      this.eventsGateway.emitTaskUpdate(organizationId, {
        taskId,
        status: 'in_progress',
        message: `${step.name}...`,
        agentName: step.name,
        progress,
      });

      // Build step-specific prompt
      const stepPrompt = this.buildStepPrompt(
        step.prompt,
        task,
        lastResult,
        payload,
      );

      conversationHistory.push({
        role: 'user',
        content: stepPrompt,
      });

      try {
        const response = await aiProvider.complete(conversationHistory, {
          systemPrompt: `You are an expert software development AI assistant helping with task: "${task.title}".
Provide concise, actionable responses. When implementing, provide actual code or detailed instructions.`,
          maxTokens: 2000,
          temperature: 0.5,
        });

        lastResult = response.content;

        conversationHistory.push({
          role: 'assistant',
          content: lastResult,
        });

        // Log step completion
        this.eventsGateway.emitAgentLog(organizationId, taskId, {
          agentName: step.name,
          action: `Completed ${step.name.toLowerCase()}`,
          details: {
            tokensUsed: response.tokensUsed,
            summaryLength: lastResult.length,
          },
        });

        await this.tasksService.addAgentLog(organizationId, taskId, {
          agentName: step.name,
          action: `Completed ${step.name.toLowerCase()}`,
          details: {
            summary:
              lastResult.substring(0, 500) +
              (lastResult.length > 500 ? '...' : ''),
          },
        });
      } catch (error) {
        this.logger.error(`Step ${step.name} failed: ${error.message}`);

        await this.tasksService.addAgentLog(organizationId, taskId, {
          agentName: step.name,
          action: `${step.name} failed`,
          details: { error: error.message },
        });

        throw error;
      }
    }

    // Store the final result in the task metadata
    this.eventsGateway.emitTaskUpdate(organizationId, {
      taskId,
      status: 'in_progress',
      message: 'Processing complete, preparing result...',
      progress: 100,
    });
  }

  private buildStepPrompt(
    step: string,
    task: {
      title: string;
      description: string | null;
      externalIssueUrl: string | null;
    },
    previousResult: string,
    payload?: Record<string, unknown>,
  ): string {
    const taskContext = `
Task: ${task.title}
Description: ${task.description || 'No description'}
${task.externalIssueUrl ? `External Issue: ${task.externalIssueUrl}` : ''}
${payload ? `Additional Context: ${JSON.stringify(payload)}` : ''}
`;

    switch (step) {
      case 'research':
        return `${taskContext}

Research Phase: Analyze this task and identify:
1. What information is needed to complete this task
2. Potential approaches and solutions
3. Any dependencies or prerequisites
4. Risks and considerations

Provide a structured research summary.`;

      case 'plan':
        return `Based on your research:
${previousResult}

Planning Phase: Create a detailed implementation plan:
1. Break down the task into specific steps
2. Identify files/components that need to be modified
3. Define acceptance criteria
4. Estimate complexity and effort

Provide a structured implementation plan.`;

      case 'implement':
        return `Based on your plan:
${previousResult}

Implementation Phase: Provide the actual implementation:
1. Write the code or detailed instructions
2. Include any necessary configurations
3. Handle edge cases
4. Add appropriate comments

Provide the complete implementation details.`;

      case 'review':
        return `Based on your implementation:
${previousResult}

Review Phase: Self-review the implementation:
1. Check for bugs or issues
2. Verify all requirements are met
3. Suggest improvements
4. Provide final recommendations

Summarize the final result and any remaining considerations.`;

      default:
        return `Continue working on the task:\n${taskContext}`;
    }
  }

  private async handleComplete(
    taskId: string,
    organizationId: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const result = payload || {
      type: 'comment',
      comment: 'Task completed by AI',
    };

    await this.tasksService.complete(organizationId, taskId, result);

    this.eventsGateway.emitTaskCompleted(organizationId, taskId, result as any);
  }

  private async handleFail(
    taskId: string,
    organizationId: string,
    reason?: string,
  ): Promise<void> {
    await this.tasksService.fail(
      organizationId,
      taskId,
      reason || 'Unknown error',
    );

    this.eventsGateway.emitTaskFailed(
      organizationId,
      taskId,
      reason || 'Unknown error',
    );
  }
}
