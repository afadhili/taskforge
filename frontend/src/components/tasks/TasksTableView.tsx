import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api";
import { message } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task } from "@/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_OPTIONS: { value: Task["status"]; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "done", label: "Done" },
];

const PRIORITY_VARIANT: Record<Task["priority"], BadgeVariant> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export function TasksTableView({
  tasks,
}: {
  tasks: Task[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: Task["status"] }) => {
      await api.patch(`/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Status updated");
    },
    onError: (error) => toast.error(message(error).message),
  });

  return (
    <Card className="py-0">
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50"
                onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground">TF-{task.id}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {task.assignee?.name ?? "Unassigned"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={PRIORITY_VARIANT[task.priority]} className="capitalize">
                    {task.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <Select
                    value={task.status}
                    onValueChange={(value) => {
                      if (!value) return;
                      updateStatus.mutate({ taskId: task.id, status: value });
                    }}
                  >
                    <SelectTrigger size="sm" className="w-36" aria-label={`Status of ${task.title}`}>
                      <SelectValue>
                        {(value: Task["status"]) =>
                          STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{task.deadline || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
