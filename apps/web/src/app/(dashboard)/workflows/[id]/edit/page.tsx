"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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

const emptyDefinition: WorkflowDefinition = {
  version: "1.0",
  nodes: [],
  edges: [],
  variables: {},
};

export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
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
      toast.success("Workflow started", {
        action: {
          label: "View execution",
          onClick: () =>
            router.push(
              `/workflows/${workflowId}/executions/${result.executionId}`,
            ),
        },
      });
    } catch {
      toast.error("Failed to run workflow");
    }
  }, [workflowId, runWorkflow, router]);

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
            {isNew ? "New Workflow" : workflow?.name || "Edit Workflow"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? "Create a new automated workflow"
              : workflow?.description || "Visual workflow editor"}
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
                  : emptyDefinition
            }
            onSave={handleSave}
            onRun={handleRun}
          />
        )}
      </div>
    </div>
  );
}
