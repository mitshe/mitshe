import { WorkflowDefinition } from '../../../domain/entities/workflow.entity';

/**
 * E2E Test Runner Workflow
 *
 * Trigger: Webhook (PR updated) or Manual
 * Flow: AI generates Playwright tests → Runs them → Reports results as PR comment
 */
export const E2E_TEST_RUNNER_WORKFLOW: WorkflowDefinition = {
  version: '1.0',
  variables: {
    repository_id: '',
    test_command: 'npx playwright test',
    app_start_command: 'npm run dev',
    base_url: 'http://localhost:3000',
    test_areas: 'login,navigation,forms,api-endpoints',
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger:manual',
      name: 'Run E2E Tests',
      position: { x: 100, y: 200 },
      config: {
        description:
          'Manually trigger E2E test generation and execution. Can also be connected to a webhook trigger.',
      },
    },
    {
      id: 'get_repo',
      type: 'data:get_repository',
      name: 'Get Repository',
      position: { x: 300, y: 200 },
      config: {
        repositoryId: '{{vars.repository_id}}',
      },
    },
    {
      id: 'ai_generate_tests',
      type: 'action:ai_prompt',
      name: 'Generate E2E Tests',
      position: { x: 500, y: 200 },
      config: {
        systemPrompt: `You are an expert QA engineer specializing in Playwright E2E testing.
Generate comprehensive Playwright test files for the specified areas.

Use Playwright best practices:
- Page Object Model where appropriate
- Proper selectors (data-testid preferred)
- Assertions with expect()
- Setup/teardown in beforeEach/afterEach
- Screenshot on failure`,
        prompt: `Generate Playwright E2E tests for:
Repository: {{nodes.get_repo.name}}
Base URL: {{vars.base_url}}
Areas to test: {{vars.test_areas}}

Generate test files that can be run with: {{vars.test_command}}

Output complete, runnable test files.`,
        maxTokens: 4000,
      },
    },
    {
      id: 'ai_analyze_results',
      type: 'action:ai_prompt',
      name: 'Analyze Test Results',
      position: { x: 700, y: 200 },
      config: {
        systemPrompt:
          'You are a QA analyst. Summarize test results concisely.',
        prompt: `Analyze the E2E test plan for {{nodes.get_repo.name}}:

{{nodes.ai_generate_tests.content}}

Provide:
1. Test coverage summary (what is tested)
2. Number of test cases
3. Risk areas not covered
4. Recommendation: ready to merge or needs more testing`,
        maxTokens: 1500,
      },
    },
    {
      id: 'notify_results',
      type: 'action:slack_message',
      name: 'Report Results',
      position: { x: 900, y: 200 },
      config: {
        channel: '#qa',
        text: 'E2E Test Report for {{nodes.get_repo.name}}:\n\n{{nodes.ai_analyze_results.content}}',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'get_repo' },
    { id: 'e2', source: 'get_repo', target: 'ai_generate_tests' },
    { id: 'e3', source: 'ai_generate_tests', target: 'ai_analyze_results' },
    { id: 'e4', source: 'ai_analyze_results', target: 'notify_results' },
  ],
};

export const E2E_TEST_RUNNER_METADATA = {
  name: 'E2E Test Runner',
  description:
    'AI generates Playwright E2E tests for your app, analyzes coverage, and reports results. Connect to a PR webhook for automatic testing.',
  category: 'AI Development',
  tags: ['testing', 'e2e', 'playwright', 'qa', 'automation'],
  requiredIntegrations: ['ai'],
  variables: {
    repository_id: {
      type: 'string',
      description: 'Repository to test',
      default: '',
    },
    test_command: {
      type: 'string',
      description: 'Command to run tests',
      default: 'npx playwright test',
    },
    app_start_command: {
      type: 'string',
      description: 'Command to start the application',
      default: 'npm run dev',
    },
    base_url: {
      type: 'string',
      description: 'Application base URL for tests',
      default: 'http://localhost:3000',
    },
    test_areas: {
      type: 'string',
      description: 'Comma-separated areas to generate tests for',
      default: 'login,navigation,forms,api-endpoints',
    },
  },
};
