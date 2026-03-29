import { Injectable, Logger } from '@nestjs/common';
import { ExpressionContext } from './types';

/**
 * Expression Evaluator
 *
 * Evaluates templated strings and conditions in workflow definitions.
 *
 * Template syntax:
 * - {{trigger.fieldName}} - Access trigger data
 * - {{vars.variableName}} - Access workflow variables
 * - {{nodes.nodeId.outputField}} - Access node output
 * - {{env.ENV_VAR}} - Access environment variable
 * - {{ctx.field}} - Access workflow context
 *
 * Friendly aliases (shortcuts for common expressions):
 * - {{branch}} → {{ctx.branch}}
 * - {{repo}} → {{ctx.repositoryFullPath}}
 * - {{mr.url}} → {{ctx.mrUrl}}
 * - {{mr.id}} → {{ctx.mrId}}
 * - {{files}} → {{ctx.files}}
 * - {{issue}} → {{ctx.issueKey}}
 * - {{task}} → {{ctx.taskDescription}}
 *
 * Condition syntax:
 * - Comparison: ==, !=, >, <, >=, <=
 * - Logical: &&, ||, !
 * - Contains: contains(field, value)
 * - Empty checks: isEmpty(field), isNotEmpty(field)
 */
@Injectable()
export class ExpressionEvaluator {
  private readonly logger = new Logger(ExpressionEvaluator.name);

  // Friendly aliases for common workflow context values
  private readonly aliases: Record<string, string> = {
    // Simple aliases (single word)
    branch: 'ctx.branch',
    repo: 'ctx.repositoryFullPath',
    files: 'ctx.files',
    issue: 'ctx.issueKey',
    task: 'ctx.taskDescription',
    // MR aliases
    'mr.url': 'ctx.mrUrl',
    'mr.id': 'ctx.mrId',
    // Repository aliases
    'repo.name': 'ctx.repositoryName',
    'repo.path': 'ctx.repositoryFullPath',
    'repo.url': 'ctx.webUrl',
    'repo.clone': 'ctx.cloneUrl',
    'repo.branch': 'ctx.defaultBranch',
    // Issue aliases
    'issue.key': 'ctx.issueKey',
    'issue.url': 'ctx.issueUrl',
  };

  /**
   * Interpolate a template string with context values
   * @param preserveUnresolved If true, keep {{path}} when value is not found
   */
  interpolate(
    template: string,
    context: ExpressionContext,
    preserveUnresolved = true,
  ): string {
    if (!template || typeof template !== 'string') {
      return template;
    }

    // Replace {{path}} with actual values
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      const value = this.resolvePath(trimmedPath, context);

      if (value === undefined || value === null) {
        this.logger.debug(
          `Expression path "${trimmedPath}" resolved to null/undefined`,
        );
        return preserveUnresolved ? match : '';
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Interpolate all string values in an object recursively
   */
  interpolateObject<T extends Record<string, unknown>>(
    obj: T,
    context: ExpressionContext,
  ): T {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolate(value, context);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'string'
            ? this.interpolate(item, context)
            : typeof item === 'object' && item !== null
              ? this.interpolateObject(item as Record<string, unknown>, context)
              : item,
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(
          value as Record<string, unknown>,
          context,
        );
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }

  /**
   * Evaluate a condition expression
   */
  evaluateCondition(condition: string, context: ExpressionContext): boolean {
    if (
      !condition ||
      typeof condition !== 'string' ||
      condition.trim() === ''
    ) {
      return false; // Empty condition means false
    }

    try {
      // First interpolate any template expressions
      const interpolated = this.interpolate(condition, context);

      // Parse and evaluate the condition
      return this.parseCondition(interpolated, context);
    } catch (error) {
      this.logger.error(
        `Error evaluating condition "${condition}": ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Expand aliases in a path
   * e.g., "mr.url" → "ctx.mrUrl", "branch" → "ctx.branch"
   */
  private expandAlias(path: string): string {
    // Sort aliases by length descending to match more specific ones first
    // e.g., "repo.name" should match before "repo"
    const sortedAliases = Object.entries(this.aliases).sort(
      (a, b) => b[0].length - a[0].length,
    );

    for (const [alias, expansion] of sortedAliases) {
      if (path === alias) {
        return expansion;
      }
      if (path.startsWith(alias + '.')) {
        return expansion + path.slice(alias.length);
      }
    }
    return path;
  }

  /**
   * Resolve a dot-notation path in the context
   * Supports array access: items[0], nested[0].field
   * Supports aliases: branch → ctx.branch, mr.url → ctx.mrUrl
   */
  private resolvePath(path: string, context: ExpressionContext): unknown {
    // First expand any aliases
    const expandedPath = this.expandAlias(path);

    // Split by dots, but preserve array indices
    const parts = expandedPath.match(/[^.[\]]+|\[\d+\]/g) || [];
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array index [n]
      if (part.startsWith('[') && part.endsWith(']')) {
        const index = parseInt(part.slice(1, -1), 10);
        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        if (typeof current !== 'object') {
          return undefined;
        }
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  /**
   * Parse and evaluate a condition string
   */
  private parseCondition(
    condition: string,
    context: ExpressionContext,
  ): boolean {
    // Handle OR (||)
    if (condition.includes('||')) {
      const parts = condition.split('||').map((p) => p.trim());
      return parts.some((part) => this.parseCondition(part, context));
    }

    // Handle AND (&&)
    if (condition.includes('&&')) {
      const parts = condition.split('&&').map((p) => p.trim());
      return parts.every((part) => this.parseCondition(part, context));
    }

    // Handle NOT (!)
    if (condition.startsWith('!')) {
      return !this.parseCondition(condition.slice(1).trim(), context);
    }

    // Handle parentheses
    if (condition.startsWith('(') && condition.endsWith(')')) {
      return this.parseCondition(condition.slice(1, -1), context);
    }

    // Handle function calls
    const functionMatch = condition.match(/^(\w+)\((.+)\)$/);
    if (functionMatch) {
      return this.evaluateFunction(functionMatch[1], functionMatch[2], context);
    }

    // Handle infix operators: contains, startsWith, endsWith
    const infixOperators = ['contains', 'startsWith', 'endsWith'];
    for (const op of infixOperators) {
      const regex = new RegExp(`^(.+?)\\s+${op}\\s+(.+)$`);
      const match = condition.match(regex);
      if (match) {
        const left = this.parseValue(match[1].trim(), context);
        const right = this.parseValue(match[2].trim(), context);
        switch (op) {
          case 'contains':
            return this.contains(left, right);
          case 'startsWith':
            return typeof left === 'string' && left.startsWith(String(right));
          case 'endsWith':
            return typeof left === 'string' && left.endsWith(String(right));
        }
      }
    }

    // Handle comparisons
    const comparisonOperators = [
      '===',
      '!==',
      '==',
      '!=',
      '>=',
      '<=',
      '>',
      '<',
    ];
    for (const op of comparisonOperators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map((s) => s.trim());
        return this.compare(
          this.parseValue(left, context),
          this.parseValue(right, context),
          op,
        );
      }
    }

    // Boolean value
    if (condition === 'true') return true;
    if (condition === 'false') return false;

    // Truthy check on a path
    const value = this.resolvePath(condition, context);
    return this.isTruthy(value);
  }

  /**
   * Evaluate built-in functions
   */
  private evaluateFunction(
    name: string,
    args: string,
    context: ExpressionContext,
  ): boolean {
    const parsedArgs = this.parseArguments(args, context);

    switch (name) {
      case 'isEmpty':
        return this.isEmpty(parsedArgs[0]);

      case 'isNotEmpty':
        return !this.isEmpty(parsedArgs[0]);

      case 'contains':
        return this.contains(parsedArgs[0], parsedArgs[1]);

      case 'startsWith':
        return String(parsedArgs[0]).startsWith(String(parsedArgs[1]));

      case 'endsWith':
        return String(parsedArgs[0]).endsWith(String(parsedArgs[1]));

      case 'matches':
        try {
          const regex = new RegExp(String(parsedArgs[1]));
          return regex.test(String(parsedArgs[0]));
        } catch {
          return false;
        }

      case 'length': {
        const val = parsedArgs[0];
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'string') return val.length > 0;
        return false;
      }

      case 'isNumber':
        return (
          typeof parsedArgs[0] === 'number' || !isNaN(Number(parsedArgs[0]))
        );

      case 'exists':
        return parsedArgs[0] !== undefined && parsedArgs[0] !== null;

      default:
        this.logger.warn(`Unknown function: ${name}`);
        return false;
    }
  }

  /**
   * Parse function arguments
   */
  private parseArguments(
    argsString: string,
    context: ExpressionContext,
  ): unknown[] {
    const args: unknown[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (const char of argsString) {
      if ((char === '"' || char === "'") && depth === 0) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        current += char;
      } else if (char === '(' && !inString) {
        depth++;
        current += char;
      } else if (char === ')' && !inString) {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0 && !inString) {
        args.push(this.parseValue(current.trim(), context));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.parseValue(current.trim(), context));
    }

    return args;
  }

  /**
   * Parse a value (string literal, number, boolean, or path)
   */
  private parseValue(value: string, context: ExpressionContext): unknown {
    // String literal
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    // Number
    if (!isNaN(Number(value))) {
      return Number(value);
    }

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Null/undefined
    if (value === 'null' || value === 'undefined') return null;

    // Path reference
    return this.resolvePath(value, context);
  }

  /**
   * Compare two values with an operator
   */
  private compare(left: unknown, right: unknown, operator: string): boolean {
    switch (operator) {
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return Number(left) > Number(right);
      case '<':
        return Number(left) < Number(right);
      case '>=':
        return Number(left) >= Number(right);
      case '<=':
        return Number(left) <= Number(right);
      default:
        return false;
    }
  }

  /**
   * Check if a value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Check if a value contains another value
   */
  private contains(haystack: unknown, needle: unknown): boolean {
    if (Array.isArray(haystack)) {
      return haystack.includes(needle);
    }
    if (typeof haystack === 'string') {
      return haystack.includes(String(needle));
    }
    if (typeof haystack === 'object' && haystack !== null) {
      return String(needle) in haystack;
    }
    return false;
  }

  /**
   * Check if a value is truthy
   */
  private isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }
}
