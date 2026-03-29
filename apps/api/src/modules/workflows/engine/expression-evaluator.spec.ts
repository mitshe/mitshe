import { ExpressionEvaluator } from './expression-evaluator';
import { ExpressionContext } from './types';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  describe('interpolate', () => {
    it('should replace template variables with values from context', () => {
      const template = 'Hello {{trigger.name}}, welcome to {{vars.company}}!';
      const context: ExpressionContext = {
        trigger: { name: 'John' },
        vars: { company: 'Acme Inc' },
        nodes: {},
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('Hello John, welcome to Acme Inc!');
    });

    it('should handle nested object access', () => {
      const template =
        'Issue: {{trigger.issue.key}} - {{trigger.issue.summary}}';
      const context: ExpressionContext = {
        trigger: {
          issue: {
            key: 'PROJ-123',
            summary: 'Fix the bug',
          },
        },
        vars: {},
        nodes: {},
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('Issue: PROJ-123 - Fix the bug');
    });

    it('should handle node outputs', () => {
      const template = 'AI Response: {{nodes.ai_1.content}}';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {
          ai_1: {
            content: 'This is the AI generated response',
          },
        },
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('AI Response: This is the AI generated response');
    });

    it('should return original template when variable not found', () => {
      const template = 'Value: {{trigger.missing}}';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('Value: {{trigger.missing}}');
    });

    it('should handle multiple variables in same template', () => {
      const template = '{{trigger.a}} + {{trigger.b}} = {{vars.result}}';
      const context: ExpressionContext = {
        trigger: { a: '1', b: '2' },
        vars: { result: '3' },
        nodes: {},
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('1 + 2 = 3');
    });

    it('should handle empty template', () => {
      const template = '';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('');
    });

    it('should handle template with no variables', () => {
      const template = 'Hello World';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('Hello World');
    });

    it('should resolve ctx values', () => {
      const template = 'Branch: {{ctx.branch}}, MR: {{ctx.mrUrl}}';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
        ctx: {
          branch: 'feature/test',
          mrUrl: 'https://github.com/org/repo/pull/123',
        },
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe(
        'Branch: feature/test, MR: https://github.com/org/repo/pull/123',
      );
    });

    it('should resolve simple aliases (branch, repo, files)', () => {
      const template = 'Working on {{branch}} in {{repo}}';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
        ctx: {
          branch: 'main',
          repositoryFullPath: 'org/my-repo',
        },
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('Working on main in org/my-repo');
    });

    it('should resolve mr.url and mr.id aliases', () => {
      const template = 'MR #{{mr.id}}: {{mr.url}}';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
        ctx: {
          mrId: '456',
          mrUrl: 'https://github.com/org/repo/pull/456',
        },
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('MR #456: https://github.com/org/repo/pull/456');
    });

    it('should resolve repo.* aliases', () => {
      const template = 'Repo: {{repo.name}} ({{repo.url}})';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
        ctx: {
          repositoryName: 'my-app',
          webUrl: 'https://github.com/org/my-app',
        },
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('Repo: my-app (https://github.com/org/my-app)');
    });

    it('should resolve issue and task aliases', () => {
      const template = 'Issue: {{issue}}, Task: {{task}}';
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
        ctx: {
          issueKey: 'PROJ-123',
          taskDescription: 'Fix the bug in login',
        },
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('Issue: PROJ-123, Task: Fix the bug in login');
    });

    it('should handle array access', () => {
      const template = 'First item: {{trigger.items[0]}}';
      const context: ExpressionContext = {
        trigger: { items: ['apple', 'banana', 'cherry'] },
        vars: {},
        nodes: {},
      };

      const result = evaluator.interpolate(template, context);
      expect(result).toBe('First item: apple');
    });
  });

  describe('interpolateObject', () => {
    it('should interpolate all string values in an object', () => {
      const obj = {
        message: 'Hello {{trigger.name}}',
        channel: '{{vars.channel}}',
        nested: {
          value: '{{nodes.node1.output}}',
        },
      };
      const context: ExpressionContext = {
        trigger: { name: 'User' },
        vars: { channel: '#general' },
        nodes: { node1: { output: 'result' } },
      };

      const result = evaluator.interpolateObject(obj, context);
      expect(result).toEqual({
        message: 'Hello User',
        channel: '#general',
        nested: {
          value: 'result',
        },
      });
    });

    it('should not modify non-string values', () => {
      const obj = {
        number: 42,
        boolean: true,
        nullValue: null,
        string: '{{trigger.value}}',
      };
      const context: ExpressionContext = {
        trigger: { value: 'test' },
        vars: {},
        nodes: {},
      };

      const result = evaluator.interpolateObject(obj, context);
      expect(result).toEqual({
        number: 42,
        boolean: true,
        nullValue: null,
        string: 'test',
      });
    });

    it('should handle arrays', () => {
      const obj = {
        items: ['{{trigger.a}}', '{{trigger.b}}'],
      };
      const context: ExpressionContext = {
        trigger: { a: 'first', b: 'second' },
        vars: {},
        nodes: {},
      };

      const result = evaluator.interpolateObject(obj, context);
      expect(result).toEqual({
        items: ['first', 'second'],
      });
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate equality condition', () => {
      const context: ExpressionContext = {
        trigger: { status: 'active' },
        vars: {},
        nodes: {},
      };

      expect(
        evaluator.evaluateCondition('trigger.status == "active"', context),
      ).toBe(true);
      expect(
        evaluator.evaluateCondition('trigger.status == "inactive"', context),
      ).toBe(false);
    });

    it('should evaluate inequality condition', () => {
      const context: ExpressionContext = {
        trigger: { count: 10 },
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('trigger.count != 5', context)).toBe(
        true,
      );
      expect(evaluator.evaluateCondition('trigger.count != 10', context)).toBe(
        false,
      );
    });

    it('should evaluate greater than condition', () => {
      const context: ExpressionContext = {
        trigger: { value: 15 },
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('trigger.value > 10', context)).toBe(
        true,
      );
      expect(evaluator.evaluateCondition('trigger.value > 20', context)).toBe(
        false,
      );
    });

    it('should evaluate less than condition', () => {
      const context: ExpressionContext = {
        trigger: { value: 5 },
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('trigger.value < 10', context)).toBe(
        true,
      );
      expect(evaluator.evaluateCondition('trigger.value < 3', context)).toBe(
        false,
      );
    });

    it('should evaluate greater than or equal condition', () => {
      const context: ExpressionContext = {
        trigger: { value: 10 },
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('trigger.value >= 10', context)).toBe(
        true,
      );
      expect(evaluator.evaluateCondition('trigger.value >= 11', context)).toBe(
        false,
      );
    });

    it('should evaluate less than or equal condition', () => {
      const context: ExpressionContext = {
        trigger: { value: 10 },
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('trigger.value <= 10', context)).toBe(
        true,
      );
      expect(evaluator.evaluateCondition('trigger.value <= 9', context)).toBe(
        false,
      );
    });

    it('should evaluate contains condition for strings', () => {
      const context: ExpressionContext = {
        trigger: { message: 'Hello World' },
        vars: {},
        nodes: {},
      };

      expect(
        evaluator.evaluateCondition(
          'trigger.message contains "World"',
          context,
        ),
      ).toBe(true);
      expect(
        evaluator.evaluateCondition('trigger.message contains "Foo"', context),
      ).toBe(false);
    });

    it('should evaluate contains condition for arrays', () => {
      const context: ExpressionContext = {
        trigger: { tags: ['bug', 'urgent', 'frontend'] },
        vars: {},
        nodes: {},
      };

      expect(
        evaluator.evaluateCondition('trigger.tags contains "bug"', context),
      ).toBe(true);
      expect(
        evaluator.evaluateCondition('trigger.tags contains "backend"', context),
      ).toBe(false);
    });

    it('should evaluate startsWith condition', () => {
      const context: ExpressionContext = {
        trigger: { key: 'PROJ-123' },
        vars: {},
        nodes: {},
      };

      expect(
        evaluator.evaluateCondition('trigger.key startsWith "PROJ"', context),
      ).toBe(true);
      expect(
        evaluator.evaluateCondition('trigger.key startsWith "TEST"', context),
      ).toBe(false);
    });

    it('should evaluate endsWith condition', () => {
      const context: ExpressionContext = {
        trigger: { file: 'document.pdf' },
        vars: {},
        nodes: {},
      };

      expect(
        evaluator.evaluateCondition('trigger.file endsWith ".pdf"', context),
      ).toBe(true);
      expect(
        evaluator.evaluateCondition('trigger.file endsWith ".doc"', context),
      ).toBe(false);
    });

    it('should return true for literal "true"', () => {
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('true', context)).toBe(true);
    });

    it('should return false for literal "false"', () => {
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('false', context)).toBe(false);
    });

    it('should return false for invalid/empty condition', () => {
      const context: ExpressionContext = {
        trigger: {},
        vars: {},
        nodes: {},
      };

      expect(evaluator.evaluateCondition('', context)).toBe(false);
      expect(evaluator.evaluateCondition('   ', context)).toBe(false);
    });

    it('should handle boolean values from context', () => {
      const context: ExpressionContext = {
        trigger: { isActive: true, isDeleted: false },
        vars: {},
        nodes: {},
      };

      expect(
        evaluator.evaluateCondition('trigger.isActive == true', context),
      ).toBe(true);
      expect(
        evaluator.evaluateCondition('trigger.isDeleted == false', context),
      ).toBe(true);
    });
  });
});
