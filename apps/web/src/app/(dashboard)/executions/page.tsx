"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="grid gap-4">
        {filteredWorkflows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="font-medium mb-2">No workflows yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create a workflow to see execution history here
              </p>
              <Link href="/workflows">
                <Button>
                  <Workflow className="w-4 h-4 mr-2" />
                  Go to Workflows
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredWorkflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <CardDescription>
                      {workflow._count?.executions ?? 0} executions
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/workflows/${workflow.id}/executions`}>
                      <Button variant="outline" size="sm">
                        View History
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <Badge
                    variant={workflow.isActive ? "default" : "secondary"}
                  >
                    {workflow.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span>Trigger: {workflow.triggerType}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
