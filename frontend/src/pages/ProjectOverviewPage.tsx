import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  Flag,
  ListTodo,
  Table2,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProjectDetail,
  useProjectLabels,
  useProjectMembers,
} from "@/lib/project";
import type { Analytics } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  done: "#22c55e",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(start?: string, end?: string): string {
  if (!start || !end) return "—";
  const days = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (days <= 1) return "1 day";
  return `${days} days`;
}

export function ProjectOverviewPage() {
  const navigate = useNavigate();
  const app = useApp();
  const projectId = Number(useParams().projectId ?? 0);

  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectDetail(projectId, app.workspace.id);
  const { data: members } = useProjectMembers(app.workspace.id);
  const { data: labels } = useProjectLabels(app.workspace.id);
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/projects", projectId, "analytics"],
    queryFn: async () =>
      (await api.get(`/projects/${projectId}/analytics`)).data.data,
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-4 p-6">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="mx-auto w-full max-w-[1200px] p-6">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not load project</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message ??
              "The project may not exist or you lack access."}
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </div>
    );
  }

  const roster = members ?? [];
  const memberCount = roster.length;
  const projectLabels = labels ?? [];
  const labelCount = projectLabels.length;

  const totalTasks = analytics?.total_tasks ?? 0;
  const completedTasks = analytics?.completed_tasks ?? 0;
  const overdueTasks = analytics?.overdue_tasks ?? 0;
  const progress =
    project.progress ??
    (totalTasks > 0 ? Math.round((100 * completedTasks) / totalTasks) : 0);
  const statusBreakdown = Object.entries(analytics?.status_breakdown ?? {});

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Project overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.key} ·{" "}
            {PROJECT_STATUS_LABELS[project.status] ?? project.status} ·{" "}
            {totalTasks} tasks · {progress}% complete
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              app.setProjectId(project.id);
              navigate("/board");
            }}
          >
            <Table2 data-slot="icon" /> Open board
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              app.setProjectId(project.id);
              app.openProjectDialog(project);
            }}
          >
            <CalendarClock data-slot="icon" /> Project settings
          </Button>
          <Button
            onClick={() => {
              app.setProjectId(project.id);
              app.openTaskDialog();
            }}
          >
            <ListTodo data-slot="icon" /> Add task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>
              {project.description || "No description yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Key</p>
              <Badge variant="outline" className="mt-1 font-semibold">
                {project.key}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                className="mt-1"
                variant={project.status === "active" ? "default" : "secondary"}
              >
                {PROJECT_STATUS_LABELS[project.status] ?? project.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start date</p>
              <p className="mt-1">{formatDate(project.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due date</p>
              <p className="mt-1">{formatDate(project.due_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="mt-1">
                {formatDuration(project.start_date, project.due_date)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Progress</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {progress}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" /> Member roster
              <Badge variant="secondary" className="ml-auto">
                {memberCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memberCount > 0 ? (
              <ul className="grid gap-2">
                {roster.map((member) => (
                  <li key={member.id} className="flex items-center gap-3">
                    <UserAvatar
                      name={member.name}
                      src={member.avatar_url}
                      className="size-8"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" /> Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-xl font-semibold tabular-nums">
                  {totalTasks}
                </p>
                <p className="text-xs text-muted-foreground">Total tasks</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xl font-semibold tabular-nums">
                  {completedTasks}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xl font-semibold tabular-nums">
                  {overdueTasks}
                </p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {statusBreakdown.map(([status, count]) => (
                <span
                  key={status}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[status] ?? "#94a3b8",
                    }}
                  />
                  {STATUS_LABELS[status] ?? status}
                  <span className="tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </span>
              ))}
              {statusBreakdown.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No status data yet.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="size-4" /> Labels
              <Badge variant="secondary" className="ml-auto">
                {labelCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {labelCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {projectLabels.map((label) => (
                  <Badge
                    key={label.id}
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No labels in this workspace yet. Create them in the API to
                color-code tasks.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {!analytics && (
        <p className="text-sm text-muted-foreground">
          Loading project analytics…
        </p>
      )}
    </div>
  );
}
