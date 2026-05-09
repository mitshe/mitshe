"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { useRunWorkflowOnTask, useTasks } from "@/lib/api/hooks";

interface RunWorkflowDialogProps {
  workflowId: string | null;
  onClose: () => void;
  onRun: (workflowId: string, executionId: string) => void;
}

export function RunWorkflowDialog({
  workflowId,
  onClose,
  onRun,
}: RunWorkflowDialogProps) {
  const runWorkflowOnTask = useRunWorkflowOnTask();
  const { data: tasks = [] } = useTasks();

  const [runTaskId, setRunTaskId] = useState<string>("");
  const [taskSearch, setTaskSearch] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
      setRunTaskId("");
      setTaskSearch("");
    }
  };

  const handleRun = async () => {
    if (!workflowId || !runTaskId) return;
    try {
      const result = await runWorkflowOnTask.mutateAsync({
        taskId: runTaskId,
        data: { workflowId },
      });
      onRun(workflowId, result.executionId);
      onClose();
      setRunTaskId("");
      setTaskSearch("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run workflow";
      toast.error(message);
    }
  };

  return (
    <Dialog open={!!workflowId} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Task</DialogTitle>
          <DialogDescription>
            Choose a task to run this workflow with.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="overflow-hidden">
          <Input
            placeholder="Search tasks..."
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-[40vh] overflow-y-auto border rounded-md">
            {tasks
              .filter(
                (t) =>
                  !taskSearch ||
                  t.title.toLowerCase().includes(taskSearch.toLowerCase()),
              )
              .slice(0, 30)
              .map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setRunTaskId(task.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b last:border-b-0 ${runTaskId === task.id ? "bg-muted font-medium" : ""}`}
                >
                  <span className="block truncate">{task.title}</span>
                  {task.externalIssueId && (
                    <span className="text-[11px] text-muted-foreground">
                      {task.externalIssueId}
                    </span>
                  )}
                </button>
              ))}
            {tasks.length === 0 && (
              <p className="px-3 py-8 text-sm text-muted-foreground text-center">
                No tasks yet. Import or create a task first.
              </p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRun}
            disabled={!runTaskId || runWorkflowOnTask.isPending}
          >
            {runWorkflowOnTask.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
