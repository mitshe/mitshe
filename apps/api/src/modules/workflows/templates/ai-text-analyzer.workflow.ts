import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * AI Text Analyzer Workflow
 *
 * Trigger: Manual with input text
 * Flow: Analyze text with AI and return structured insights
 *
 * Perfect for:
 * - Content analysis
 * - Sentiment detection
 * - Text summarization
 * - Learning AI integration
 */
export const AI_TEXT_ANALYZER_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    analysis_type: 'general', // general, sentiment, summary, keywords
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Manual Trigger',
      position: { x: 100, y: 200 },
      config: {
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze',
            },
          },
          required: ['text'],
        },
      },
    },
    {
      id: 'ai_analyze',
      type: 'action:ai_analyze',
      name: 'AI Analysis',
      position: { x: 350, y: 200 },
      config: {
        content: '{{trigger.text}}',
        schema: JSON.stringify({
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Brief summary of the content',
            },
            sentiment: {
              type: 'string',
              enum: ['positive', 'negative', 'neutral', 'mixed'],
              description: 'Overall sentiment',
            },
            keyPoints: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key points extracted from the text',
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Important keywords',
            },
            tone: {
              type: 'string',
              description: 'Writing tone (formal, casual, technical, etc.)',
            },
            wordCount: {
              type: 'number',
              description: 'Approximate word count',
            },
          },
          required: ['summary', 'sentiment', 'keyPoints'],
        }),
      },
    },
    {
      id: 'format_output',
      type: 'utility:script',
      name: 'Format Output',
      position: { x: 600, y: 200 },
      config: {
        expression: `{
          "analysis": nodes.ai_analyze.analysis,
          "inputLength": trigger.text.length,
          "analyzedAt": new Date().toISOString()
        }`,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'ai_analyze' },
    { id: 'e2', source: 'ai_analyze', target: 'format_output' },
  ],
};

export const AI_TEXT_ANALYZER_METADATA = {
  name: 'AI Text Analyzer',
  description:
    'Analyze any text with AI to extract summary, sentiment, key points, and keywords. Great for content analysis or learning AI integration.',
  category: 'ai',
  tags: ['ai', 'analysis', 'text', 'sentiment', 'nlp', 'starter'],
  requiredIntegrations: ['ai'],
  variables: {
    analysis_type: {
      type: 'string',
      description: 'Type of analysis to perform',
      default: 'general',
    },
  },
};
