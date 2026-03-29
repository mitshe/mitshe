/**
 * Atlassian Document Format (ADF) Converter
 *
 * Handles conversion between plain text and ADF format used by Jira Cloud.
 * This follows SRP by extracting format conversion from the JiraAdapter.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
 */

export interface AdfDocument {
  version: 1;
  type: 'doc';
  content: AdfNode[];
}

export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Convert plain text to Atlassian Document Format (ADF)
 */
export function textToAdf(text: string): AdfDocument {
  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);

  return {
    version: 1,
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: p.replace(/\n/g, ' '),
        },
      ],
    })),
  };
}

/**
 * Convert Atlassian Document Format (ADF) to plain text
 */
export function adfToText(adf: unknown): string {
  if (!adf || typeof adf === 'string') {
    return (adf as string) || '';
  }

  const doc = adf as AdfDocument;

  const extractText = (node: AdfNode): string => {
    if (node.type === 'text') {
      return node.text || '';
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join('');
    }

    return '';
  };

  if (doc.content && Array.isArray(doc.content)) {
    return doc.content
      .map((block) => extractText(block))
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
}

/**
 * Check if a value is an ADF document
 */
export function isAdfDocument(value: unknown): value is AdfDocument {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const doc = value as AdfDocument;
  return doc.type === 'doc' && Array.isArray(doc.content);
}

/**
 * Simplify a value that might be ADF or a complex Jira object
 * into a simple string or primitive
 */
export function simplifyJiraValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle ADF content
  if (isAdfDocument(value)) {
    return adfToText(value);
  }

  // Handle single object with value or name
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (obj.value !== undefined) return obj.value;
    if (obj.name !== undefined) return obj.name;
    if (obj.displayName !== undefined) return obj.displayName;
  }

  // Handle arrays of objects
  if (Array.isArray(value)) {
    return value.map((v) => simplifyJiraValue(v));
  }

  return value;
}
