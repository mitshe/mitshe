import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Code Improvement Suggestions Workflow
 *
 * Analyzes code and provides actionable improvement suggestions
 * including refactoring opportunities, performance tips, and best practices.
 */
export const CODE_IMPROVEMENT_SUGGESTIONS_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    focus_areas: 'all', // all, performance, security, readability, testing
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Code Input',
      position: { x: 100, y: 200 },
      config: {
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Code to analyze',
            },
            language: {
              type: 'string',
              description: 'Programming language',
            },
            context: {
              type: 'string',
              description: 'Additional context about the code (optional)',
            },
          },
          required: ['code'],
        },
      },
    },
    {
      id: 'analyze_quality',
      type: 'action:ai_analyze',
      name: 'Quality Analysis',
      position: { x: 350, y: 100 },
      config: {
        content: `Analyze this code for quality issues:

Language: {{trigger.language}}
Context: {{trigger.context}}

Code:
\`\`\`
{{trigger.code}}
\`\`\`

Identify code quality issues, code smells, and areas for improvement.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            overallQuality: {
              type: 'string',
              enum: ['excellent', 'good', 'fair', 'needs_improvement', 'poor'],
              description: 'Overall code quality rating',
            },
            codeSmells: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  location: { type: 'string' },
                  description: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                },
              },
              description: 'Identified code smells',
            },
            complexity: {
              type: 'object',
              properties: {
                level: { type: 'string', enum: ['low', 'medium', 'high'] },
                issues: { type: 'array', items: { type: 'string' } },
              },
            },
            maintainability: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                concerns: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          required: ['overallQuality', 'codeSmells'],
        }),
      },
    },
    {
      id: 'analyze_performance',
      type: 'action:ai_analyze',
      name: 'Performance Analysis',
      position: { x: 350, y: 300 },
      config: {
        content: `Analyze this code for performance issues:

Language: {{trigger.language}}

Code:
\`\`\`
{{trigger.code}}
\`\`\`

Identify performance bottlenecks, inefficiencies, and optimization opportunities.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            performanceIssues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  issue: { type: 'string' },
                  impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                  location: { type: 'string' },
                  suggestion: { type: 'string' },
                },
              },
            },
            algorithmicComplexity: {
              type: 'object',
              properties: {
                time: { type: 'string' },
                space: { type: 'string' },
                canBeImproved: { type: 'boolean' },
                improvedComplexity: { type: 'string' },
              },
            },
            optimizationOpportunities: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['performanceIssues'],
        }),
      },
    },
    {
      id: 'generate_suggestions',
      type: 'action:ai_analyze',
      name: 'Generate Suggestions',
      position: { x: 600, y: 200 },
      config: {
        content: `Based on the analysis:

Quality Issues: {{nodes.analyze_quality.analysis}}
Performance Issues: {{nodes.analyze_performance.analysis}}

Generate specific, actionable improvement suggestions with code examples.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  category: {
                    type: 'string',
                    enum: ['refactoring', 'performance', 'security', 'readability', 'testing', 'best_practice'],
                  },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  description: { type: 'string' },
                  currentCode: { type: 'string' },
                  suggestedCode: { type: 'string' },
                  rationale: { type: 'string' },
                },
              },
              description: 'List of improvement suggestions',
            },
            quickWins: {
              type: 'array',
              items: { type: 'string' },
              description: 'Easy improvements that can be made quickly',
            },
            majorRefactoring: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  effort: { type: 'string' },
                  benefit: { type: 'string' },
                },
              },
              description: 'Larger refactoring suggestions',
            },
          },
          required: ['suggestions', 'quickWins'],
        }),
      },
    },
    {
      id: 'format_output',
      type: 'utility:script',
      name: 'Format Results',
      position: { x: 850, y: 200 },
      config: {
        code: `
const quality = nodes.analyze_quality.analysis;
const performance = nodes.analyze_performance.analysis;
const suggestions = nodes.generate_suggestions.analysis;

// Sort suggestions by priority
const priorityOrder = { high: 0, medium: 1, low: 2 };
const sortedSuggestions = (suggestions.suggestions || []).sort(
  (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
);

return {
  summary: {
    overallQuality: quality.overallQuality,
    issuesFound: (quality.codeSmells || []).length + (performance.performanceIssues || []).length,
    suggestionsCount: sortedSuggestions.length,
    quickWinsCount: (suggestions.quickWins || []).length,
  },
  quality: {
    rating: quality.overallQuality,
    codeSmells: quality.codeSmells,
    complexity: quality.complexity,
    maintainability: quality.maintainability,
  },
  performance: {
    issues: performance.performanceIssues,
    complexity: performance.algorithmicComplexity,
    optimizations: performance.optimizationOpportunities,
  },
  suggestions: {
    all: sortedSuggestions,
    byCategory: sortedSuggestions.reduce((acc, s) => {
      acc[s.category] = acc[s.category] || [];
      acc[s.category].push(s);
      return acc;
    }, {}),
    quickWins: suggestions.quickWins,
    majorRefactoring: suggestions.majorRefactoring,
  },
  nextSteps: [
    "Review quick wins and implement easy improvements",
    "Address high-priority suggestions first",
    "Consider major refactoring for long-term maintainability",
    "Add tests before making significant changes",
  ],
};
        `,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'analyze_quality' },
    { id: 'e2', source: 'trigger', target: 'analyze_performance' },
    { id: 'e3', source: 'analyze_quality', target: 'generate_suggestions' },
    { id: 'e4', source: 'analyze_performance', target: 'generate_suggestions' },
    { id: 'e5', source: 'generate_suggestions', target: 'format_output' },
  ],
};

export const CODE_IMPROVEMENT_SUGGESTIONS_METADATA = {
  name: 'Code Improvement Suggestions',
  description:
    'AI-powered code analysis that identifies quality issues, performance problems, and provides actionable improvement suggestions with code examples.',
  category: 'Development',
  tags: ['ai', 'code-review', 'refactoring', 'performance', 'best-practices', 'suggestions'],
  requiredIntegrations: ['ai'],
  variables: {
    focus_areas: {
      type: 'string',
      description: 'Areas to focus on',
      default: 'all',
      options: ['all', 'performance', 'security', 'readability', 'testing'],
    },
  },
};
