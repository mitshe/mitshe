import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Task Estimation Workflow
 *
 * AI-powered task estimation based on description, complexity, and historical data.
 * Provides story points, time estimates, and risk assessment.
 */
export const TASK_ESTIMATION_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    estimation_scale: 'fibonacci', // fibonacci, tshirt, hours
    include_risks: true,
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Task Input',
      position: { x: 100, y: 200 },
      config: {
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Task description and requirements',
            },
            context: {
              type: 'string',
              description: 'Project context and tech stack (optional)',
            },
          },
          required: ['title', 'description'],
        },
      },
    },
    {
      id: 'analyze_complexity',
      type: 'action:ai_analyze',
      name: 'Analyze Complexity',
      position: { x: 350, y: 200 },
      config: {
        content: `Task: {{trigger.title}}

Description: {{trigger.description}}

Context: {{trigger.context}}

Analyze this task and provide a detailed complexity assessment.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            complexity: {
              type: 'string',
              enum: ['trivial', 'simple', 'moderate', 'complex', 'very_complex'],
              description: 'Overall complexity level',
            },
            factors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Factors contributing to complexity',
            },
            technicalChallenges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Technical challenges to consider',
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'Potential dependencies or blockers',
            },
            unknowns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Unknown factors that could affect estimation',
            },
          },
          required: ['complexity', 'factors'],
        }),
      },
    },
    {
      id: 'generate_estimate',
      type: 'action:ai_analyze',
      name: 'Generate Estimate',
      position: { x: 600, y: 200 },
      config: {
        content: `Based on this complexity analysis:
{{nodes.analyze_complexity.analysis}}

Provide time and effort estimates for this task using {{vars.estimation_scale}} scale.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            storyPoints: {
              type: 'number',
              description: 'Story points (1, 2, 3, 5, 8, 13, 21)',
            },
            hoursEstimate: {
              type: 'object',
              properties: {
                optimistic: { type: 'number' },
                realistic: { type: 'number' },
                pessimistic: { type: 'number' },
              },
              description: 'Time estimate in hours (three-point estimation)',
            },
            tshirtSize: {
              type: 'string',
              enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
              description: 'T-shirt size estimate',
            },
            confidence: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Confidence in the estimate',
            },
            reasoning: {
              type: 'string',
              description: 'Explanation for the estimate',
            },
            suggestedBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subtask: { type: 'string' },
                  estimate: { type: 'string' },
                },
              },
              description: 'Suggested task breakdown with individual estimates',
            },
          },
          required: ['storyPoints', 'hoursEstimate', 'confidence', 'reasoning'],
        }),
      },
    },
    {
      id: 'assess_risks',
      type: 'action:ai_analyze',
      name: 'Risk Assessment',
      position: { x: 850, y: 200 },
      config: {
        content: `Task: {{trigger.title}}
Complexity: {{nodes.analyze_complexity.analysis.complexity}}
Estimate: {{nodes.generate_estimate.analysis.storyPoints}} story points

Identify potential risks and mitigation strategies.`,
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
                },
              },
              description: 'List of identified risks',
            },
            overallRiskLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Overall risk level for this task',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recommendations to reduce risk',
            },
          },
          required: ['risks', 'overallRiskLevel'],
        }),
      },
    },
    {
      id: 'format_output',
      type: 'utility:script',
      name: 'Format Results',
      position: { x: 1100, y: 200 },
      config: {
        code: `
const complexity = nodes.analyze_complexity.analysis;
const estimate = nodes.generate_estimate.analysis;
const risks = nodes.assess_risks.analysis;

return {
  task: {
    title: trigger.title,
    description: trigger.description,
  },
  analysis: {
    complexity: complexity.complexity,
    factors: complexity.factors,
    challenges: complexity.technicalChallenges,
    dependencies: complexity.dependencies,
  },
  estimate: {
    storyPoints: estimate.storyPoints,
    hours: estimate.hoursEstimate,
    tshirtSize: estimate.tshirtSize,
    confidence: estimate.confidence,
    reasoning: estimate.reasoning,
    breakdown: estimate.suggestedBreakdown,
  },
  risks: {
    level: risks.overallRiskLevel,
    items: risks.risks,
    recommendations: risks.recommendations,
  },
  summary: \`**\${trigger.title}**\\n\\nEstimate: \${estimate.storyPoints} SP (\${estimate.tshirtSize})\\nComplexity: \${complexity.complexity}\\nRisk: \${risks.overallRiskLevel}\\nConfidence: \${estimate.confidence}\\n\\n\${estimate.reasoning}\`,
};
        `,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'analyze_complexity' },
    { id: 'e2', source: 'analyze_complexity', target: 'generate_estimate' },
    { id: 'e3', source: 'generate_estimate', target: 'assess_risks' },
    { id: 'e4', source: 'assess_risks', target: 'format_output' },
  ],
};

export const TASK_ESTIMATION_METADATA = {
  name: 'AI Task Estimation',
  description:
    'Get AI-powered task estimates including story points, time estimates, complexity analysis, and risk assessment. Perfect for sprint planning.',
  category: 'Project Management',
  tags: ['ai', 'estimation', 'planning', 'agile', 'scrum', 'story-points'],
  requiredIntegrations: ['ai'],
  variables: {
    estimation_scale: {
      type: 'string',
      description: 'Estimation scale to use',
      default: 'fibonacci',
      options: ['fibonacci', 'tshirt', 'hours'],
    },
    include_risks: {
      type: 'boolean',
      description: 'Include risk assessment',
      default: true,
    },
  },
};
