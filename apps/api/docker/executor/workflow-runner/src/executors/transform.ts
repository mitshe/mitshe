/**
 * Transform Node Executors
 * Handles data transformation operations
 */

import type { ExecutorContext } from './index.js';

export async function executeTransformNode(
  type: string,
  config: Record<string, unknown>,
  _ctx: ExecutorContext,
): Promise<Record<string, unknown>> {
  switch (type) {
    case 'transform:json_parse':
      return executeJsonParse(config);

    case 'transform:json_stringify':
      return executeJsonStringify(config);

    case 'transform:template':
      return executeTemplate(config);

    case 'transform:map':
      return executeMap(config);

    case 'transform:filter':
      return executeFilter(config);

    case 'transform:merge':
      return executeMerge(config);

    default:
      throw new Error(`Unknown transform action: ${type}`);
  }
}

/**
 * Parse JSON string to object
 */
function executeJsonParse(config: Record<string, unknown>): Record<string, unknown> {
  const input = config.input as string;

  if (!input) {
    throw new Error('Input string is required');
  }

  try {
    const parsed = JSON.parse(input);
    return { result: parsed, success: true };
  } catch (error) {
    return {
      result: null,
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Stringify object to JSON
 */
function executeJsonStringify(config: Record<string, unknown>): Record<string, unknown> {
  const input = config.input;
  const pretty = config.pretty !== false;

  try {
    const result = pretty ? JSON.stringify(input, null, 2) : JSON.stringify(input);
    return { result, success: true };
  } catch (error) {
    return {
      result: null,
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Simple template string interpolation
 */
function executeTemplate(config: Record<string, unknown>): Record<string, unknown> {
  const template = config.template as string;
  const variables = (config.variables as Record<string, unknown>) || {};

  if (!template) {
    throw new Error('Template is required');
  }

  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }

  return { result };
}

/**
 * Map over array
 */
function executeMap(config: Record<string, unknown>): Record<string, unknown> {
  const input = config.input as unknown[];
  const property = config.property as string;

  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }

  if (property) {
    // Extract property from each item
    const result = input.map((item) => {
      if (item && typeof item === 'object') {
        return (item as Record<string, unknown>)[property];
      }
      return item;
    });
    return { result };
  }

  return { result: input };
}

/**
 * Filter array
 */
function executeFilter(config: Record<string, unknown>): Record<string, unknown> {
  const input = config.input as unknown[];
  const property = config.property as string;
  const value = config.value;
  const operator = (config.operator as string) || 'equals';

  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }

  const result = input.filter((item) => {
    if (!property) return Boolean(item);

    const itemValue =
      item && typeof item === 'object' ? (item as Record<string, unknown>)[property] : item;

    switch (operator) {
      case 'equals':
        return itemValue === value;
      case 'notEquals':
        return itemValue !== value;
      case 'contains':
        return String(itemValue).includes(String(value));
      case 'startsWith':
        return String(itemValue).startsWith(String(value));
      case 'endsWith':
        return String(itemValue).endsWith(String(value));
      case 'greaterThan':
        return Number(itemValue) > Number(value);
      case 'lessThan':
        return Number(itemValue) < Number(value);
      default:
        return Boolean(itemValue);
    }
  });

  return { result, count: result.length };
}

/**
 * Merge objects
 */
function executeMerge(config: Record<string, unknown>): Record<string, unknown> {
  const objects = config.objects as Record<string, unknown>[];

  if (!Array.isArray(objects)) {
    throw new Error('Objects must be an array');
  }

  const result = objects.reduce((acc, obj) => {
    if (obj && typeof obj === 'object') {
      return { ...acc, ...obj };
    }
    return acc;
  }, {});

  return { result };
}
