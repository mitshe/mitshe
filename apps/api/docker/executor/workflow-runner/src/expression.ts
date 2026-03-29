/**
 * Expression Evaluator
 * Handles template interpolation and condition evaluation
 */

export interface ExpressionContext {
  trigger: Record<string, unknown>;
  vars: Record<string, unknown>;
  nodes: Record<string, Record<string, unknown>>;
  ctx: Record<string, unknown>;
  env: Record<string, string | undefined>;
}

/**
 * Interpolate template strings like {{ nodes.analyze.content }}
 */
export function interpolate(template: string, context: ExpressionContext): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr: string) => {
    try {
      const value = evaluateExpression(expr.trim(), context);
      // Debug logging
      if (process.env.DEBUG_EXPRESSIONS === 'true') {
        console.log(`[Expression] "${expr.trim()}" => ${JSON.stringify(value)}`);
      }
      return value !== undefined ? String(value) : '';
    } catch (e) {
      if (process.env.DEBUG_EXPRESSIONS === 'true') {
        console.log(`[Expression] "${expr.trim()}" => ERROR: ${e}`);
      }
      return '';
    }
  });
}

/**
 * Interpolate all string values in an object
 */
export function interpolateObject<T extends Record<string, unknown>>(
  obj: T,
  context: ExpressionContext,
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = interpolate(value, context);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? interpolate(item, context)
          : typeof item === 'object' && item !== null
            ? interpolateObject(item as Record<string, unknown>, context)
            : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = interpolateObject(value as Record<string, unknown>, context);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Shortcut mappings for common variables
 * These allow users to use shorter expressions like {{branch}} instead of {{ctx.branch}}
 */
const SHORTCUTS: Record<string, string> = {
  // Basic shortcuts
  branch: 'ctx.branch',
  repo: 'ctx.repositoryFullPath',
  files: 'ctx.files',
  issue: 'ctx.issueKey',
  task: 'ctx.taskDescription',
  // MR/PR shortcuts
  'mr.url': 'ctx.mrUrl',
  'mr.id': 'ctx.mrId',
  'pr.url': 'ctx.prUrl',
  'pr.id': 'ctx.prId',
  // Repository shortcuts
  'repo.name': 'ctx.repositoryName',
  'repo.url': 'ctx.webUrl',
  'repo.branch': 'ctx.defaultBranch',
  'repo.path': 'ctx.repositoryFullPath',
  // Issue shortcuts
  'issue.key': 'ctx.issueKey',
  'issue.url': 'ctx.issueUrl',
};

/**
 * Evaluate a simple expression path like "nodes.analyze.content"
 */
function evaluateExpression(expr: string, context: ExpressionContext): unknown {
  // Check for shortcuts first
  const resolvedExpr = SHORTCUTS[expr] || expr;

  const parts = resolvedExpr.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Evaluate a condition expression
 */
export function evaluateCondition(condition: string, context: ExpressionContext): boolean {
  // Handle simple true/false literals
  if (condition === 'true') return true;
  if (condition === 'false') return false;

  // Replace template expressions first
  const interpolated = interpolate(condition, context);

  // Simple comparisons
  const comparisonMatch = interpolated.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparisonMatch) {
    const [, left, op, right] = comparisonMatch;
    const leftVal = parseValue(left.trim());
    const rightVal = parseValue(right.trim());

    switch (op) {
      case '===':
      case '==':
        return leftVal === rightVal;
      case '!==':
      case '!=':
        return leftVal !== rightVal;
      case '>':
        return Number(leftVal) > Number(rightVal);
      case '>=':
        return Number(leftVal) >= Number(rightVal);
      case '<':
        return Number(leftVal) < Number(rightVal);
      case '<=':
        return Number(leftVal) <= Number(rightVal);
    }
  }

  // Truthy check
  return Boolean(interpolated && interpolated !== 'false' && interpolated !== '0');
}

function parseValue(val: string): string | number | boolean {
  // Remove quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  // Numbers
  if (!isNaN(Number(val))) {
    return Number(val);
  }
  // Booleans
  if (val === 'true') return true;
  if (val === 'false') return false;
  // String
  return val;
}
