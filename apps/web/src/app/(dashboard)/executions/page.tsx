"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  History,
  Filter,
  Workflow,
  ArrowRight,
} from "lucide-react";
import { useWorkflows } from "@/lib/api/hooks";

export default function ExecutionsPage() {
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");
  const { data: workflows = [], isLoading } = useWorkflows();

  // Calculate total executions from _count
  const totalExecutions = workflows.reduce(
    (acc, w) => acc + (w._count?.executions ?? 0),
    0
  );

  // Filter workflows if filter is set
  const filteredWorkflows =
    workflowFilter === "all"
      ? workflows
      : workflows.filter((w) => w.id === workflowFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Executions</h1>
        <p className="text-muted-foreground">
          View workflow execution history
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <History className="h-4 w-4" />
          <span>Total Executions</span>
          <span className="font-semibold text-foreground">{totalExecutions}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Workflow className="h-4 w-4" />
          <span>Workflows</span>
          <span className="font-semibold text-foreground">{workflows.length}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All workflows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All workflows</SelectItem>
            {workflows.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                {workflow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {workflowFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWorkflowFilter("all")}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Workflows with executions */}
      {filteredWorkflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <History className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a workflow to see execution history here
          </p>
          <Link href="/workflows">
            <Button>
              <Workflow className="w-4 h-4 mr-2" />
              Go to Workflows
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{workflow.name}</span>
                  <Badge
                    variant={workflow.isActive ? "default" : "secondary"}
                  >
                    {workflow.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{workflow._count?.executions ?? 0} executions</span>
                  <span>Trigger: {workflow.triggerType}</span>
                </div>
              </div>
              <Link href={`/workflows/${workflow.id}/executions`}>
                <Button variant="outline" size="sm">
                  View History
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
