/**
 * Workflow Entity - Visual Flow Builder with IaC
 *
 * Users can create workflows via GUI (drag & drop blocks)
 * or via code (YAML/JSON). Both produce the same structure.
 */

// Re-export types from engine for consistency
import {
  NodeType,
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition,
} from '../../modules/workflows/engine/types';

export { NodeType, WorkflowNode, WorkflowEdge, WorkflowDefinition };

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeConfig {
  [key: string]: unknown;
}

/**
 * Example workflow in IaC (YAML):
 *
 * ```yaml
 * version: "1.0"
 * variables:
 *   slack_channel: "#dev-notifications"
 *
 * nodes:
 *   - id: trigger
 *     type: trigger:jira:webhook
 *     name: JIRA AI Label Added
 *     config:
 *       event: issue_updated
 *       filter:
 *         labels:
 *           contains: "AI"
 *
 *   - id: analyze
 *     type: ai:analyze
 *     name: Analyze Task
 *     config:
 *       model: claude-3-5-sonnet
 *       prompt: "Analyze if this task can be automated"
 *
 *   - id: condition
 *     type: control:condition
 *     name: Can Automate?
 *     config:
 *       expression: "{{ analyze.output.canAutomate == true }}"
 *
 *   - id: developer
 *     type: ai:developer
 *     name: Write Code
 *     config:
 *       agents: [researcher, developer, tester]
 *
 *   - id: create_mr
 *     type: action:gitlab:mr
 *     name: Create MR
 *     config:
 *       title: "{{ task.title }}"
 *       description: "{{ developer.output.summary }}"
 *
 *   - id: notify_slack
 *     type: action:slack:notify
 *     name: Notify Team
 *     config:
 *       channel: "{{ variables.slack_channel }}"
 *       message: "MR created: {{ create_mr.output.url }}"
 *
 *   - id: notify_manual
 *     type: action:slack:notify
 *     name: Request Human Help
 *     config:
 *       channel: "{{ variables.slack_channel }}"
 *       message: "Task needs human: {{ task.title }}"
 *
 * edges:
 *   - source: trigger
 *     target: analyze
 *   - source: analyze
 *     target: condition
 *   - source: condition
 *     target: developer
 *     condition: "canAutomate == true"
 *   - source: condition
 *     target: notify_manual
 *     condition: "canAutomate == false"
 *   - source: developer
 *     target: create_mr
 *   - source: create_mr
 *     target: notify_slack
 * ```
 */

export class Workflow {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public name: string,
    public description: string | null,
    public definition: WorkflowDefinition,
    public isActive: boolean,
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    definition: WorkflowDefinition;
    createdBy: string;
  }): Workflow {
    return new Workflow(
      params.id,
      params.organizationId,
      params.name,
      params.description ?? null,
      params.definition,
      false, // inactive by default
      params.createdBy,
      new Date(),
      new Date(),
    );
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  updateDefinition(definition: WorkflowDefinition): void {
    this.definition = definition;
    this.updatedAt = new Date();
  }

  getNode(nodeId: string): WorkflowNode | undefined {
    return this.definition.nodes.find((n) => n.id === nodeId);
  }

  getTriggerNodes(): WorkflowNode[] {
    return this.definition.nodes.filter((n) => n.type.startsWith('trigger:'));
  }

  validateDefinition(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Must have at least one trigger
    const triggers = this.getTriggerNodes();
    if (triggers.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // All edges must reference existing nodes
    const nodeIds = new Set(this.definition.nodes.map((n) => n.id));
    for (const edge of this.definition.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
