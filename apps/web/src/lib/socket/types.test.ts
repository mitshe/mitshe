import { describe, it, expect } from "vitest";
import type {
  TaskUpdatePayload,
  WorkflowExecutionPayload,
  WorkflowNodeExecutionPayload,
  IntegrationEventPayload,
  NotificationPayload,
  SocketEvent,
} from "./types";

describe("Socket Types", () => {
  describe("TaskUpdatePayload", () => {
    it("should have correct structure", () => {
      const payload: TaskUpdatePayload = {
        taskId: "task-123",
        status: "running",
        message: "Processing...",
        agentName: "CodeReviewAgent",
        progress: 50,
      };

      expect(payload.taskId).toBe("task-123");
      expect(payload.status).toBe("running");
      expect(payload.message).toBe("Processing...");
      expect(payload.agentName).toBe("CodeReviewAgent");
      expect(payload.progress).toBe(50);
    });

    it("should allow minimal required fields", () => {
      const payload: TaskUpdatePayload = {
        taskId: "task-123",
        status: "completed",
      };

      expect(payload.taskId).toBeDefined();
      expect(payload.status).toBeDefined();
      expect(payload.message).toBeUndefined();
    });
  });

  describe("WorkflowExecutionPayload", () => {
    it("should have correct structure for running execution", () => {
      const payload: WorkflowExecutionPayload = {
        executionId: "exec-123",
        workflowId: "workflow-456",
        status: "running",
        startedAt: "2024-01-20T10:00:00Z",
      };

      expect(payload.executionId).toBe("exec-123");
      expect(payload.workflowId).toBe("workflow-456");
      expect(payload.status).toBe("running");
      expect(payload.startedAt).toBeDefined();
    });

    it("should have correct structure for failed execution", () => {
      const payload: WorkflowExecutionPayload = {
        executionId: "exec-123",
        workflowId: "workflow-456",
        status: "failed",
        startedAt: "2024-01-20T10:00:00Z",
        completedAt: "2024-01-20T10:05:00Z",
        error: "Node ai_1 failed: API rate limit exceeded",
      };

      expect(payload.status).toBe("failed");
      expect(payload.error).toBeDefined();
      expect(payload.completedAt).toBeDefined();
    });

    it("should have correct structure for completed execution", () => {
      const payload: WorkflowExecutionPayload = {
        executionId: "exec-123",
        workflowId: "workflow-456",
        status: "completed",
        startedAt: "2024-01-20T10:00:00Z",
        completedAt: "2024-01-20T10:05:00Z",
        output: { result: "success" },
      };

      expect(payload.status).toBe("completed");
      expect(payload.output).toEqual({ result: "success" });
    });
  });

  describe("WorkflowNodeExecutionPayload", () => {
    it("should have correct structure", () => {
      const payload: WorkflowNodeExecutionPayload = {
        executionId: "exec-123",
        workflowId: "workflow-456",
        nodeId: "node-789",
        nodeName: "AI Analyze",
        nodeType: "action:ai_analyze",
        status: "completed",
        startedAt: "2024-01-20T10:01:00Z",
        completedAt: "2024-01-20T10:02:00Z",
        output: { analysis: { summary: "Test result" } },
        duration: 60000,
      };

      expect(payload.nodeId).toBe("node-789");
      expect(payload.nodeName).toBe("AI Analyze");
      expect(payload.nodeType).toBe("action:ai_analyze");
      expect(payload.status).toBe("completed");
      expect(payload.duration).toBe(60000);
    });

    it("should handle failed node", () => {
      const payload: WorkflowNodeExecutionPayload = {
        executionId: "exec-123",
        workflowId: "workflow-456",
        nodeId: "node-789",
        nodeName: "JIRA Create",
        nodeType: "action:jira_create_issue",
        status: "failed",
        error: "Project not found",
      };

      expect(payload.status).toBe("failed");
      expect(payload.error).toBe("Project not found");
    });
  });

  describe("IntegrationEventPayload", () => {
    it("should have correct structure for JIRA event", () => {
      const payload: IntegrationEventPayload = {
        type: "jira",
        event: "issue:created",
        data: {
          issueKey: "PROJ-123",
          summary: "New issue",
        },
        timestamp: "2024-01-20T10:00:00Z",
      };

      expect(payload.type).toBe("jira");
      expect(payload.event).toBe("issue:created");
      expect(payload.data.issueKey).toBe("PROJ-123");
    });

    it("should handle GitHub event", () => {
      const payload: IntegrationEventPayload = {
        type: "github",
        event: "pull_request:opened",
        data: {
          number: 42,
          title: "Feature branch",
          repository: "org/repo",
        },
        timestamp: "2024-01-20T10:00:00Z",
      };

      expect(payload.type).toBe("github");
      expect(payload.data.number).toBe(42);
    });
  });

  describe("NotificationPayload", () => {
    it("should have correct structure for success notification", () => {
      const payload: NotificationPayload = {
        id: "notif-123",
        type: "success",
        title: "Workflow completed",
        message: "Your workflow has finished successfully.",
        timestamp: "2024-01-20T10:00:00Z",
      };

      expect(payload.type).toBe("success");
      expect(payload.title).toBe("Workflow completed");
    });

    it("should handle error notification with data", () => {
      const payload: NotificationPayload = {
        id: "notif-456",
        type: "error",
        title: "Workflow failed",
        message: "The workflow execution encountered an error.",
        timestamp: "2024-01-20T10:00:00Z",
        data: {
          executionId: "exec-123",
          failedNode: "node-789",
        },
      };

      expect(payload.type).toBe("error");
      expect(payload.data?.executionId).toBe("exec-123");
    });
  });

  describe("SocketEvent types", () => {
    it("should include all expected event types", () => {
      const events: SocketEvent[] = [
        "task:update",
        "task:completed",
        "task:failed",
        "agent:log",
        "workflow:execution:started",
        "workflow:execution:completed",
        "workflow:execution:failed",
        "workflow:execution:cancelled",
        "workflow:node:update",
        "integration:event",
        "notification",
      ];

      expect(events).toHaveLength(11);
    });
  });
});
