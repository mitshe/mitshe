"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { WorkflowDefinition } from "@/components/workflow-editor/types";
import { toast } from "sonner";
import {
  useWorkflow,
  useUpdateWorkflow,
  useRunWorkflow,
} from "@/lib/api/hooks";

const WorkflowEditor = dynamic(
  () => import("@/components/workflow-editor/workflow-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const mockDefinition: WorkflowDefinition = {
  version: "1.0",
  nodes: [
    {
      id: "trigger_1",
      type: "trigger:jira_issue",
      name: "JIRA Issue Created",
      position: { x: 250, y: 50 },
      config: { projectKey: "PROJ", events: ["created"] },
    },
    {
      id: "ai_1",
      type: "action:ai_analyze",
      name: "Analyze Issue",
      position: { x: 250, y: 200 },
      config: { content: "{{trigger.summary}}", schema: "" },
    },
    {
      id: "slack_1",
      type: "action:slack_message",
      name: "Notify Team",
      position: { x: 250, y: 350 },
      config: {
        channel: "#engineering",
        message: "New issue: {{trigger.key}}",
      },
    },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "ai_1" },
    { id: "e2", source: "ai_1", target: "slack_1" },
  ],
  variables: {},
};

export default function WorkflowEditPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const isNew = workflowId === "new";

  const { data: workflow, isLoading } = useWorkflow(isNew ? "" : workflowId);
  const updateWorkflow = useUpdateWorkflow();
  const runWorkflow = useRunWorkflow();

  const handleSave = useCallback(
    async (definition: WorkflowDefinition) => {
      try {
        await updateWorkflow.mutateAsync({
          id: workflowId,
          data: {
            definition: {
              version: definition.version,
              nodes: definition.nodes.map((node) => ({
                id: node.id,
                type: node.type,
                name: node.name,
                position: node.position || { x: 0, y: 0 },
                config: node.config,
              })),
              edges: definition.edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                condition: edge.condition,
              })),
              variables: definition.variables || {},
            },
          },
        });
        toast.success("Workflow saved successfully");
      } catch {
        toast.error("Failed to save workflow");
      }
    },
    [workflowId, updateWorkflow],
  );

  const handleRun = useCallback(async () => {
    try {
      const result = await runWorkflow.mutateAsync({ id: workflowId });
      toast.success(`Workflow execution started (ID: ${result.executionId})`);
    } catch {
      toast.error("Failed to run workflow");
    }
  }, [workflowId, runWorkflow]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-card">
        <Link href="/workflows">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">
            {isNew ? "New Workflow" : "Edit Workflow"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? "Create a new automated workflow"
              : `Editing workflow ${workflowId}`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading && !isNew ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WorkflowEditor
            workflowId={isNew ? undefined : workflowId}
            initialDefinition={
              isNew
                ? undefined
                : workflow?.definition
                  ? {
                      version: "1.0",
                      nodes:
                        (workflow.definition as WorkflowDefinition).nodes || [],
                      edges:
                        (workflow.definition as WorkflowDefinition).edges || [],
                      variables:
                        (workflow.definition as WorkflowDefinition).variables ||
                        {},
                    }
                  : mockDefinition
            }
            onSave={handleSave}
            onRun={handleRun}
          />
        )}
      </div>
    </div>
  );
}
