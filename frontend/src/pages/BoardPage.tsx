import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleIcon,
  FolderKanban,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { message } from "@/lib/errors";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { toast } from "sonner";
import type { Task } from "@/types";
import { TasksTableView } from "@/components/tasks/TasksTableView";

const LANES = [
  { key: "backlog", label: "Backlog", dot: "bg-muted-foreground/40" },
  { key: "todo", label: "To do", dot: "bg-violet-500" },
  { key: "in_progress", label: "In progress", dot: "bg-blue-500" },
  { key: "in_review", label: "In review", dot: "bg-amber-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const today = new Date().toISOString().slice(0, 10);
const DELETE_DRAG_TYPE = "application/x-taskforge-delete-item";

const LANE_DOTS: Record<string, string> = Object.fromEntries(
  LANES.map((l) => [l.key, l.dot]),
);

export function BoardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const app = useApp();
  const [dragging, setDragging] = useState<number | null>(null);
  const [hoverLane, setHoverLane] = useState<string | null>(null);
  const [listView, setListView] = useState(false);

  const project = app.project;

  const tasks = useQuery({
    queryKey: ["tasks", project?.id],
    enabled: !!project,
    queryFn: async () => {
      const res = await api.get(`/projects/${project!.id}/tasks?per_page=100`);
      return (res.data.data ?? []) as Task[];
    },
  });

  const visible = (tasks.data ?? []).filter((task) =>
    `${task.title} ${task.description ?? ""}`
      .toLowerCase()
      .includes(app.search.toLowerCase()),
  );

  const moveTask = async (task: Task, status: string) => {
    if (task.status === status) return;
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      await qc.invalidateQueries({ queryKey: ["tasks", project?.id] });
      toast.success(
        `Moved "${task.title}" to ${LANES.find((l) => l.key === status)?.label ?? status}`,
      );
    } catch (error) {
      toast.error(message(error).message);
    }
  };

  if (!project) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>
              Create a project to start planning and tracking work on the board.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => app.openProjectDialog()}>
              <Plus data-slot="icon" /> New project
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const done = visible.filter((t) => t.status === "done").length;
  const overdue = visible.filter(
    (t) => t.deadline && t.deadline < today && t.status !== "done",
  ).length;
  const completion = visible.length
    ? Math.round((done * 100) / visible.length)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-semibold">
              {project.key}
            </Badge>
            Project · Updated just now
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.description ||
              "A shared space for your team to plan, track, and ship great work."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => app.openProjectDialog(project)}
        >
          <MoreHorizontal data-slot="icon" /> Manage
        </Button>
        <Button onClick={() => app.openTaskDialog()}>
          <Plus data-slot="icon" /> Add task
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-1.5 p-4">
            <p className="text-xs text-muted-foreground">Completion</p>
            <p className="text-xl font-semibold tracking-tight">
              {completion}%
            </p>
            <Progress value={completion} className="h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1.5 p-4">
            <p className="text-xs text-muted-foreground">Open tasks</p>
            <p className="text-xl font-semibold tracking-tight">
              {visible.length - done}
            </p>
            <p className="text-xs text-muted-foreground">across all statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1.5 p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-xl font-semibold tracking-tight">{overdue}</p>
            <p className="text-xs text-muted-foreground">needs attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1.5 p-4">
            <p className="text-xs text-muted-foreground">Team</p>
            <p className="text-xl font-semibold tracking-tight">Active</p>
            <p className="text-xs text-muted-foreground">collaboration is on</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <Tabs
          value={listView ? "list" : "board"}
          onValueChange={(value) => setListView(value === "list")}
        >
          <TabsList>
            <TabsTrigger value="board" className="gap-1.5">
              <CircleIcon className="size-3.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <ListTodo className="size-3.5" /> List
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          {listView
            ? "Update task status or open a task to edit details"
            : "Drag tasks between columns to update status"}
        </span>
      </div>

      {tasks.isLoading ? (
        listView ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {LANES.map((lane) => (
              <div
                key={lane.key}
                className="space-y-2 rounded-lg border border-border bg-muted/50 p-3"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        )
      ) : listView ? (
        visible.length ? (
          <TasksTableView projectId={project.id} tasks={visible} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">No tasks match</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {app.search.trim()
                ? "No tasks match the current search."
                : "Add a task to this project to see it here."}
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {LANES.map((lane) => {
            const laneTasks = visible.filter((t) => t.status === lane.key);
            return (
              <div
                key={lane.key}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHoverLane(lane.key);
                }}
                onDragLeave={() =>
                  setHoverLane((current) =>
                    current === lane.key ? null : current,
                  )
                }
                onDrop={(event) => {
                  event.preventDefault();
                  setHoverLane(null);
                  const task = visible.find((t) => t.id === dragging);
                  if (task) void moveTask(task, lane.key);
                }}
                className={`min-h-56 rounded-lg border bg-muted/50 p-2.5 transition-colors ${
                  hoverLane === lane.key ? "border-primary" : "border-border"
                }`}
              >
                <div className="mb-2 flex h-6 items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${LANE_DOTS[lane.key]}`}
                  />
                  <span className="text-xs font-semibold">{lane.label}</span>
                  <span className="grid h-4 min-w-4 place-items-center rounded bg-muted px-1 text-[10px] text-muted-foreground">
                    {laneTasks.length}
                  </span>
                </div>

                {laneTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="mb-2 cursor-grab py-0 active:cursor-grabbing"
                    draggable
                    onDragStart={(event) => {
                      setDragging(task.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(
                        DELETE_DRAG_TYPE,
                        JSON.stringify({
                          type: "task",
                          id: task.id,
                          name: task.title,
                        }),
                      );
                    }}
                    onDragEnd={() => setDragging(null)}
                  >
                    <CardContent className="space-y-2 p-2.5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={`px-1.5 py-0 text-[10px] font-bold ${PRIORITY_STYLES[task.priority] ?? ""}`}
                        >
                          {task.priority}
                        </Badge>
                        {task.deadline &&
                          task.deadline < today &&
                          task.status !== "done" && (
                            <span className="text-[10px] font-medium text-destructive">
                              overdue
                            </span>
                          )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="ml-auto"
                          aria-label={`Edit task: ${task.title}`}
                          title="Edit task"
                          draggable={false}
                          onClick={() =>
                            navigate(`/projects/${project.id}/tasks/${task.id}`)
                          }
                        >
                          <Pencil />
                        </Button>
                      </div>
                      <button
                        type="button"
                        className="block w-full text-left text-[13px] leading-snug font-medium hover:underline"
                        onClick={() =>
                          navigate(`/projects/${project.id}/tasks/${task.id}`)
                        }
                      >
                        {task.title}
                      </button>
                      {task.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <div className="flex min-h-5 items-center gap-1.5 text-[11px] text-muted-foreground">
                        {task.assignee ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <UserAvatar
                                  name={task.assignee.name}
                                  src={task.assignee.avatar_url}
                                  className="size-5"
                                  fallbackClassName="text-[9px]"
                                />
                              }
                            />
                            <TooltipContent>
                              {task.assignee.name}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        {task.deadline && (
                          <span
                            className={
                              task.deadline < today && task.status !== "done"
                                ? "text-destructive"
                                : ""
                            }
                          >
                            {new Date(task.deadline).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        )}
                        {task.estimate_minutes > 0 && (
                          <span className="ml-auto">
                            {Math.round(task.estimate_minutes / 60)}h
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {laneTasks.length === 0 && (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Drop tasks here
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
