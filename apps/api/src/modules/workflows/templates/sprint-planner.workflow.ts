import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Sprint Planner Workflow
 *
 * AI-assisted sprint planning that helps prioritize backlog items,
 * balance workload, and identify potential risks.
 */
export const SPRINT_PLANNER_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    sprint_duration: '2 weeks',
    team_velocity: 40,
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Sprint Input',
      position: { x: 100, y: 200 },
      config: {
        inputSchema: {
          type: 'object',
          properties: {
            sprintGoal: {
              type: 'string',
              description: 'Sprint goal or theme',
            },
            backlogItems: {
              type: 'string',
              description: 'List of backlog items to consider (JSON or text)',
            },
            teamCapacity: {
              type: 'string',
              description: 'Team capacity in story points or hours',
            },
            constraints: {
              type: 'string',
              description: 'Any constraints (vacations, dependencies, etc.)',
            },
          },
          required: ['sprintGoal', 'backlogItems'],
        },
      },
    },
    {
      id: 'analyze_backlog',
      type: 'action:ai_analyze',
      name: 'Analyze Backlog',
      position: { x: 350, y: 200 },
      config: {
        content: `Sprint Goal: {{trigger.sprintGoal}}

Backlog Items:
{{trigger.backlogItems}}

Team Capacity: {{trigger.teamCapacity}} (default: {{vars.team_velocity}} story points)
Sprint Duration: {{vars.sprint_duration}}
Constraints: {{trigger.constraints}}

Analyze the backlog items and categorize them by priority, effort, and value.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  estimatedPoints: { type: 'number' },
                  priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  businessValue: { type: 'string', enum: ['high', 'medium', 'low'] },
                  technicalRisk: { type: 'string', enum: ['high', 'medium', 'low'] },
                  dependencies: { type: 'array', items: { type: 'string' } },
                  category: { type: 'string' },
                },
              },
            },
            totalEstimate: {
              type: 'number',
              description: 'Total story points in backlog',
            },
            capacityUtilization: {
              type: 'number',
              description: 'Percentage of capacity that would be used',
            },
          },
          required: ['items', 'totalEstimate'],
        }),
      },
    },
    {
      id: 'prioritize_items',
      type: 'action:ai_analyze',
      name: 'Prioritize & Select',
      position: { x: 600, y: 100 },
      config: {
        content: `Sprint Goal: {{trigger.sprintGoal}}
Team Capacity: {{trigger.teamCapacity}} story points
Analyzed Items: {{nodes.analyze_backlog.analysis}}

Select and prioritize items for the sprint that:
1. Align with the sprint goal
2. Fit within team capacity
3. Balance risk and value
4. Consider dependencies`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            selectedItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  points: { type: 'number' },
                  priority: { type: 'number' },
                  rationale: { type: 'string' },
                },
              },
              description: 'Items selected for the sprint in priority order',
            },
            deferredItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
              description: 'Items deferred to next sprint with reasons',
            },
            totalPoints: {
              type: 'number',
              description: 'Total points for selected items',
            },
            bufferRemaining: {
              type: 'number',
              description: 'Remaining capacity buffer',
            },
            goalAlignment: {
              type: 'string',
              description: 'How well selection aligns with sprint goal',
            },
          },
          required: ['selectedItems', 'totalPoints'],
        }),
      },
    },
    {
      id: 'identify_risks',
      type: 'action:ai_analyze',
      name: 'Risk Assessment',
      position: { x: 600, y: 300 },
      config: {
        content: `Sprint Plan:
Selected Items: {{nodes.prioritize_items.analysis.selectedItems}}
Total Points: {{nodes.prioritize_items.analysis.totalPoints}}
Constraints: {{trigger.constraints}}

Identify risks and mitigation strategies for this sprint.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  risk: { type: 'string' },
                  probability: { type: 'string', enum: ['low', 'medium', 'high'] },
                  impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                  mitigation: { type: 'string' },
                  contingency: { type: 'string' },
                },
              },
            },
            overcommitmentRisk: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Risk of not completing all items',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recommendations for a successful sprint',
            },
          },
          required: ['risks', 'overcommitmentRisk'],
        }),
      },
    },
    {
      id: 'format_plan',
      type: 'utility:script',
      name: 'Generate Plan',
      position: { x: 850, y: 200 },
      config: {
        code: `
const backlog = nodes.analyze_backlog.analysis;
const selection = nodes.prioritize_items.analysis;
const risks = nodes.identify_risks.analysis;

return {
  sprint: {
    goal: trigger.sprintGoal,
    duration: vars.sprint_duration,
    capacity: trigger.teamCapacity || vars.team_velocity,
    plannedPoints: selection.totalPoints,
    bufferRemaining: selection.bufferRemaining,
  },
  plan: {
    selectedItems: selection.selectedItems,
    deferredItems: selection.deferredItems,
    goalAlignment: selection.goalAlignment,
  },
  risks: {
    overcommitmentLevel: risks.overcommitmentRisk,
    items: risks.risks,
    recommendations: risks.recommendations,
  },
  metrics: {
    itemsPlanned: selection.selectedItems.length,
    itemsDeferred: (selection.deferredItems || []).length,
    capacityUtilization: Math.round((selection.totalPoints / (trigger.teamCapacity || vars.team_velocity)) * 100),
  },
  summary: \`**Sprint Plan: \${trigger.sprintGoal}**

Items: \${selection.selectedItems.length} selected (\${selection.totalPoints} points)
Capacity: \${selection.totalPoints}/\${trigger.teamCapacity || vars.team_velocity} points (\${Math.round((selection.totalPoints / (trigger.teamCapacity || vars.team_velocity)) * 100)}%)
Risk Level: \${risks.overcommitmentRisk}

Top Priority:
\${selection.selectedItems.slice(0, 3).map((item, i) => \`\${i + 1}. \${item.title} (\${item.points} pts)\`).join('\\n')}\`,
};
        `,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'analyze_backlog' },
    { id: 'e2', source: 'analyze_backlog', target: 'prioritize_items' },
    { id: 'e3', source: 'analyze_backlog', target: 'identify_risks' },
    { id: 'e4', source: 'prioritize_items', target: 'identify_risks' },
    { id: 'e5', source: 'prioritize_items', target: 'format_plan' },
    { id: 'e6', source: 'identify_risks', target: 'format_plan' },
  ],
};

export const SPRINT_PLANNER_METADATA = {
  name: 'AI Sprint Planner',
  description:
    'AI-assisted sprint planning that analyzes backlog items, prioritizes based on value and risk, and creates a balanced sprint plan with risk assessment.',
  category: 'Project Management',
  tags: ['ai', 'sprint', 'planning', 'agile', 'scrum', 'prioritization', 'backlog'],
  requiredIntegrations: ['ai'],
  variables: {
    sprint_duration: {
      type: 'string',
      description: 'Sprint duration',
      default: '2 weeks',
      options: ['1 week', '2 weeks', '3 weeks', '4 weeks'],
    },
    team_velocity: {
      type: 'number',
      description: 'Default team velocity in story points',
      default: 40,
    },
  },
};
