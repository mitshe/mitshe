import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * Project Analyzer Workflow
 *
 * Analyzes a project idea or requirements and provides comprehensive
 * insights, potential challenges, and suggestions.
 */
export const PROJECT_ANALYZER_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    analysis_depth: 'comprehensive', // quick, standard, comprehensive
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Project Input',
      position: { x: 100, y: 200 },
      config: {
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Project name',
            },
            description: {
              type: 'string',
              description: 'Project description and goals',
            },
            techStack: {
              type: 'string',
              description: 'Planned or existing tech stack (optional)',
            },
            teamSize: {
              type: 'string',
              description: 'Team size and composition (optional)',
            },
            timeline: {
              type: 'string',
              description: 'Expected timeline (optional)',
            },
          },
          required: ['projectName', 'description'],
        },
      },
    },
    {
      id: 'analyze_feasibility',
      type: 'action:ai_analyze',
      name: 'Feasibility Analysis',
      position: { x: 350, y: 100 },
      config: {
        content: `Project: {{trigger.projectName}}

Description: {{trigger.description}}

Tech Stack: {{trigger.techStack}}
Team Size: {{trigger.teamSize}}
Timeline: {{trigger.timeline}}

Analyze the feasibility of this project.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            feasibilityScore: {
              type: 'number',
              description: 'Feasibility score from 1-10',
            },
            technicalFeasibility: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                assessment: { type: 'string' },
                challenges: { type: 'array', items: { type: 'string' } },
              },
            },
            resourceFeasibility: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                assessment: { type: 'string' },
                gaps: { type: 'array', items: { type: 'string' } },
              },
            },
            timelineFeasibility: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                assessment: { type: 'string' },
                risks: { type: 'array', items: { type: 'string' } },
              },
            },
            overallAssessment: {
              type: 'string',
              description: 'Overall feasibility assessment',
            },
          },
          required: ['feasibilityScore', 'overallAssessment'],
        }),
      },
    },
    {
      id: 'identify_requirements',
      type: 'action:ai_analyze',
      name: 'Requirements Analysis',
      position: { x: 350, y: 300 },
      config: {
        content: `Project: {{trigger.projectName}}

Description: {{trigger.description}}

Identify and categorize the key requirements for this project.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            functionalRequirements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  requirement: { type: 'string' },
                  priority: { type: 'string', enum: ['must-have', 'should-have', 'nice-to-have'] },
                  complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
                },
              },
            },
            nonFunctionalRequirements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  requirement: { type: 'string' },
                  importance: { type: 'string' },
                },
              },
            },
            assumptions: {
              type: 'array',
              items: { type: 'string' },
            },
            constraints: {
              type: 'array',
              items: { type: 'string' },
            },
            questionsToResolve: {
              type: 'array',
              items: { type: 'string' },
              description: 'Questions that need to be answered',
            },
          },
          required: ['functionalRequirements', 'nonFunctionalRequirements'],
        }),
      },
    },
    {
      id: 'suggest_architecture',
      type: 'action:ai_analyze',
      name: 'Architecture Suggestions',
      position: { x: 600, y: 200 },
      config: {
        content: `Project: {{trigger.projectName}}
Requirements: {{nodes.identify_requirements.analysis}}
Tech Stack Preference: {{trigger.techStack}}

Suggest an appropriate architecture and technology stack.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            recommendedArchitecture: {
              type: 'object',
              properties: {
                pattern: { type: 'string' },
                description: { type: 'string' },
                pros: { type: 'array', items: { type: 'string' } },
                cons: { type: 'array', items: { type: 'string' } },
              },
            },
            suggestedTechStack: {
              type: 'object',
              properties: {
                frontend: { type: 'array', items: { type: 'string' } },
                backend: { type: 'array', items: { type: 'string' } },
                database: { type: 'array', items: { type: 'string' } },
                infrastructure: { type: 'array', items: { type: 'string' } },
                tools: { type: 'array', items: { type: 'string' } },
              },
            },
            alternativeApproaches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  approach: { type: 'string' },
                  whenToUse: { type: 'string' },
                },
              },
            },
            keyDecisions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key architectural decisions to make',
            },
          },
          required: ['recommendedArchitecture', 'suggestedTechStack'],
        }),
      },
    },
    {
      id: 'create_roadmap',
      type: 'action:ai_analyze',
      name: 'Roadmap Generation',
      position: { x: 850, y: 200 },
      config: {
        content: `Project: {{trigger.projectName}}
Requirements: {{nodes.identify_requirements.analysis}}
Architecture: {{nodes.suggest_architecture.analysis.recommendedArchitecture}}

Create a high-level project roadmap with phases and milestones.`,
        schema: JSON.stringify({
          type: 'object',
          properties: {
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  duration: { type: 'string' },
                  goals: { type: 'array', items: { type: 'string' } },
                  deliverables: { type: 'array', items: { type: 'string' } },
                  dependencies: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            milestones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  criteria: { type: 'string' },
                  phase: { type: 'string' },
                },
              },
            },
            mvpScope: {
              type: 'object',
              properties: {
                features: { type: 'array', items: { type: 'string' } },
                timeline: { type: 'string' },
                rationale: { type: 'string' },
              },
            },
            risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  risk: { type: 'string' },
                  mitigation: { type: 'string' },
                },
              },
            },
          },
          required: ['phases', 'milestones', 'mvpScope'],
        }),
      },
    },
    {
      id: 'format_report',
      type: 'utility:script',
      name: 'Generate Report',
      position: { x: 1100, y: 200 },
      config: {
        code: `
const feasibility = nodes.analyze_feasibility.analysis;
const requirements = nodes.identify_requirements.analysis;
const architecture = nodes.suggest_architecture.analysis;
const roadmap = nodes.create_roadmap.analysis;

return {
  project: trigger.projectName,
  executive_summary: {
    feasibility_score: feasibility.feasibilityScore,
    assessment: feasibility.overallAssessment,
    recommended_architecture: architecture.recommendedArchitecture.pattern,
    mvp_timeline: roadmap.mvpScope.timeline,
  },
  feasibility: feasibility,
  requirements: {
    functional: requirements.functionalRequirements,
    non_functional: requirements.nonFunctionalRequirements,
    open_questions: requirements.questionsToResolve,
  },
  architecture: architecture,
  roadmap: roadmap,
  next_steps: [
    "Review and validate requirements with stakeholders",
    "Make key architectural decisions: " + (architecture.keyDecisions || []).join(", "),
    "Define MVP scope and prioritize features",
    "Set up development environment and infrastructure",
    "Begin Phase 1: " + (roadmap.phases[0]?.name || "Planning"),
  ],
};
        `,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'analyze_feasibility' },
    { id: 'e2', source: 'trigger', target: 'identify_requirements' },
    { id: 'e3', source: 'analyze_feasibility', target: 'suggest_architecture' },
    { id: 'e4', source: 'identify_requirements', target: 'suggest_architecture' },
    { id: 'e5', source: 'suggest_architecture', target: 'create_roadmap' },
    { id: 'e6', source: 'create_roadmap', target: 'format_report' },
  ],
};

export const PROJECT_ANALYZER_METADATA = {
  name: 'Project Analyzer',
  description:
    'Comprehensive AI analysis of project ideas including feasibility assessment, requirements identification, architecture suggestions, and roadmap generation.',
  category: 'Project Management',
  tags: ['ai', 'planning', 'architecture', 'requirements', 'roadmap', 'analysis'],
  requiredIntegrations: ['ai'],
  variables: {
    analysis_depth: {
      type: 'string',
      description: 'Depth of analysis',
      default: 'comprehensive',
      options: ['quick', 'standard', 'comprehensive'],
    },
  },
};
