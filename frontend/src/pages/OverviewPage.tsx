import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { KanbanSquare } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { useProjectAnalytics } from "@/lib/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Analytics, Task } from "@/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT: Record<Task["status"], BadgeVariant> = {
  backlog: "outline",
  todo: "secondary",
  in_progress: "default",
  in_review: "default",
  done: "outline",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function OverviewPage() {
  const navigate = useNavigate();
  const app = useApp();
  const project = app.project;

  const tasks = useQuery({
    queryKey: ["tasks", project?.id],
    queryFn: async () => {
      const res = await api.get(`/projects/${project!.id}/tasks?per_page=100`);
      return res.data.data as Task[];
    },
    enabled: !!project,
  });

  const analytics = useProjectAnalytics(project?.id ?? 0);
  const analyticsData = analytics.data as Analytics | undefined;

  const list = tasks.data ?? [];
  const done = list.filter((task) => task.status === "done").length;
  const completion = list.length ? Math.round((done * 100) / list.length) : 0;
  const recent = [...list].reverse().slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Workspace overview</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {project?.name ?? "Overview"}
          </h1>
          <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
            {project?.description ||
              "A clear view of the work moving through this project."}
          </p>
        </div>
        <Button onClick={() => navigate("/board")} disabled={!project}>
          <KanbanSquare data-slot="icon" /> Open board
        </Button>
      </div>

      {tasks.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !project ? (
        <p className="text-sm text-muted-foreground">
          Select a project to see its overview.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total tasks" value={list.length} />
            <StatCard label="Completed" value={done} />
            <StatCard
              label="Overdue"
              value={analyticsData?.overdue_tasks ?? 0}
            />
            <Card size="sm">
              <CardContent>
                <p className="text-xs text-muted-foreground">Completion</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {completion}%
                </p>
                <Progress value={completion} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent>
              <h2 className="mb-3 text-sm font-medium">Recent tasks</h2>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks yet — add one from the board or the task list.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recent.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                        onClick={() =>
                          navigate(`/projects/${project.id}/tasks/${task.id}`)
                        }
                      >
                        <span className="min-w-0 truncate font-medium">
                          {task.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant={STATUS_VARIANT[task.status]}
                            className="capitalize"
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {task.assignee?.name ?? "Unassigned"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
