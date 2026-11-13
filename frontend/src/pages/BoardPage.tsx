import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleIcon,
  FolderKanban,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
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
import { ProjectScopeSelect } from "@/components/ProjectScopeSelect";
import { useTasksForProjects } from "@/lib/project";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from "@/components/kibo-ui/kanban";
import type { DragEndEvent } from "@/components/kibo-ui/kanban";
import {
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureRow,
  GanttHeader,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
  type GanttFeature,
  type GanttStatus,
} from "@/components/kibo-ui/gantt";

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
type BoardTask = Omit<Task, "id"> & { id: string; name: string; column: string };
const KANBAN_COLUMNS = LANES.map((lane) => ({ id: lane.key, name: lane.label, dot: lane.dot }));
const STATUS_COLORS: Record<Task["status"], string> = {
  backlog: "#94a3b8",
  todo: "#8b5cf6",
  in_progress: "#3b82f6",
  in_review: "#f59e0b",
  done: "#10b981",
};
const GANTT_STATUSES: Record<Task["status"], GanttStatus> = Object.fromEntries(
  LANES.map((lane) => [lane.key, { id: lane.key, name: lane.label, color: STATUS_COLORS[lane.key] }]),
) as Record<Task["status"], GanttStatus>;

function parseDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function BoardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const app = useApp();
  const [boardData, setBoardData] = useState<BoardTask[] | null>(null);
  const [view, setView] = useState<"board" | "list" | "timeline">("board");
  const [timelineZoom, setTimelineZoom] = useState(100);
  const projectScope = app.projectScopeId === null ? "all" : String(app.projectScopeId);
  const project = app.projects.find((item) => item.id === app.projectScopeId);
  const projectIds = project ? [project.id] : app.projects.map((item) => item.id);
  const tasks = useTasksForProjects(projectIds);

  const visible = (tasks.data ?? []).filter((task) =>
    `${task.title} ${task.description ?? ""}`
      .toLowerCase()
      .includes(app.search.toLowerCase()),
  );

  const moveTask = async (task: Task, status: string) => {
    if (task.status === status) return;
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      setBoardData(null);
      toast.success(
        `Moved "${task.title}" to ${LANES.find((l) => l.key === status)?.label ?? status}`,
      );
    } catch (error) {
      setBoardData(null);
      toast.error(message(error).message);
    }
  };

  const kanbanData: BoardTask[] = visible.map((task) => {
    const draft = boardData?.find((item) => item.id === String(task.id));
    return { ...task, id: String(task.id), name: task.title, column: draft?.column ?? task.status };
  });
  const handleDragEnd = (event: DragEndEvent) => {
    const task = visible.find((item) => String(item.id) === String(event.active.id));
    const draft = boardData?.find((item) => item.id === String(event.active.id));
    if (task && draft && draft.column !== task.status) void moveTask(task, draft.column);
    else setBoardData(null);
  };

  const ganttFeatures: GanttFeature[] = visible.flatMap((task) => {
    if (!task.date_assigned) return [];
    const startAt = parseDate(task.date_assigned);
    const dueDate = task.deadline ? parseDate(task.deadline) : startAt;
    const endAt = dueDate < startAt ? startAt : dueDate;
    const taskProject = app.projects.find((item) => item.id === task.project_id);
    return [{
      id: String(task.id),
      name: project ? task.title : `${taskProject?.key ?? "Project"} · ${task.title}`,
      startAt,
      endAt,
      status: GANTT_STATUSES[task.status],
    }];
  });
  const unscheduledTasks = visible.filter((task) => !task.date_assigned);
  const updateGanttDeadline = async (id: string, _startAt: Date, endAt: Date | null) => {
    const task = visible.find((item) => String(item.id) === id);
    if (!task || !endAt) return;
    const deadline = `${endAt.getFullYear()}-${String(endAt.getMonth() + 1).padStart(2, "0")}-${String(endAt.getDate()).padStart(2, "0")}`;
    if (task.deadline === deadline) return;
    try {
      await api.patch(`/tasks/${task.id}`, { deadline });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Updated due date for "${task.title}"`);
    } catch (error) {
      toast.error(message(error).message);
    }
  };

  if (app.projects.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Create a project to start planning and tracking work on the board.</EmptyDescription>
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
            {project && <Badge variant="secondary" className="font-semibold">{project.key}</Badge>}
            {project ? "Project · Updated just now" : "Workspace · All projects"}
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            {project?.name ?? "All projects"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project?.description ||
              "A shared space for your team to plan, track, and ship great work."}
          </p>
        </div>
        <ProjectScopeSelect
          value={projectScope}
          onValueChange={(value) => app.setProjectScopeId(value === "all" ? null : Number(value))}
        />
        {project && <Button
          variant="outline"
          onClick={() => app.openProjectDialog(project)}
        >
          <MoreHorizontal data-slot="icon" /> Manage
        </Button>}
        {project && <Button onClick={() => app.openTaskDialog()}>
          <Plus data-slot="icon" /> Add task
        </Button>}
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
          value={view}
          onValueChange={(value) => setView(value as typeof view)}
        >
          <TabsList>
            <TabsTrigger value="board" className="gap-1.5">
              <CircleIcon className="size-3.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <ListTodo className="size-3.5" /> List
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <CalendarDays className="size-3.5" /> Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          {view === "list"
            ? "Update task status or open a task to edit details"
            : view === "timeline"
              ? "Bars use estimated starts and task due dates"
              : "Drag tasks between columns to update status"}
        </span>
      </div>

      {tasks.isLoading ? (
        view === "list" ? (
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
      ) : view === "list" ? (
        visible.length ? (
          <TasksTableView tasks={visible} />
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
      ) : view === "timeline" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-3xl text-xs text-muted-foreground">
                  Each bar starts on its date assigned and ends on its due date. Resize a bar’s right edge to change its due date; the assigned date stays fixed.
                </p>
                <div className="flex items-center gap-1 rounded-md border p-1" aria-label="Timeline zoom controls">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zoom out"
                    title="Zoom out"
                    disabled={timelineZoom <= 50}
                    onClick={() => setTimelineZoom((value) => Math.max(50, value - 25))}
                  >
                    <ZoomOut />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-w-14 tabular-nums"
                    aria-label="Reset timeline zoom to 100 percent"
                    title="Reset zoom"
                    onClick={() => setTimelineZoom(100)}
                  >
                    {timelineZoom}%
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zoom in"
                    title="Zoom in"
                    disabled={timelineZoom >= 200}
                    onClick={() => setTimelineZoom((value) => Math.min(200, value + 25))}
                  >
                    <ZoomIn />
                  </Button>
                </div>
              </div>
              {ganttFeatures.length ? (
                <GanttProvider range="monthly" zoom={timelineZoom} className="h-[560px]">
                  <GanttSidebar>
                    <GanttSidebarGroup name="Tasks">
                      {ganttFeatures.map((feature) => (
                        <GanttSidebarItem
                          key={feature.id}
                          feature={feature}
                          onSelectItem={(id) => {
                            const task = visible.find((item) => String(item.id) === id);
                            if (task) navigate(`/projects/${task.project_id}/tasks/${task.id}`, { state: { backgroundLocation: location } });
                          }}
                        />
                      ))}
                    </GanttSidebarGroup>
                  </GanttSidebar>
                  <GanttTimeline>
                    <GanttHeader />
                    <GanttToday />
                    <GanttFeatureList>
                      <GanttFeatureListGroup>
                        {ganttFeatures.map((feature) => (
                          <GanttFeatureRow
                            key={feature.id}
                            features={[feature]}
                            onMove={updateGanttDeadline}
                            readOnly
                          >
                            {(item) => (
                              <button
                                type="button"
                                className="flex h-full w-full items-center rounded px-2 text-left text-xs font-medium text-white"
                                style={{ backgroundColor: item.status.color }}
                                title={`${item.name} · ${item.status.name}`}
                                onClick={() => {
                                  const task = visible.find((taskItem) => String(taskItem.id) === item.id);
                                  if (task) navigate(`/projects/${task.project_id}/tasks/${task.id}`, { state: { backgroundLocation: location } });
                                }}
                              >
                                <span className="truncate">{item.name}</span>
                              </button>
                            )}
                          </GanttFeatureRow>
                        ))}
                      </GanttFeatureListGroup>
                    </GanttFeatureList>
                  </GanttTimeline>
                </GanttProvider>
              ) : (
                <div className="grid h-[280px] place-items-center rounded-lg border border-dashed text-center">
                  <div>
                    <p className="font-medium">No tasks with an assigned date</p>
                    <p className="mt-1 text-sm text-muted-foreground">Assign a task to place it on the timeline.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {unscheduledTasks.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-semibold">Unscheduled tasks <span className="text-muted-foreground">({unscheduledTasks.length})</span></h2>
                <div className="divide-y">
                  {unscheduledTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:text-primary"
                      onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`, { state: { backgroundLocation: location } })}
                    >
                      <span className={`size-2 shrink-0 rounded-full ${LANES.find((lane) => lane.key === task.status)?.dot}`} />
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      {!project && <span className="text-xs text-muted-foreground">{app.projects.find((item) => item.id === task.project_id)?.key}</span>}
                      <span className="text-xs capitalize text-muted-foreground">{task.status.replaceAll("_", " ")}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto pb-3">
          <KanbanProvider<BoardTask, (typeof KANBAN_COLUMNS)[number]>
            columns={KANBAN_COLUMNS}
            data={kanbanData}
            onDataChange={setBoardData}
            onDragEnd={handleDragEnd}
            className="min-h-[520px] min-w-max auto-cols-[280px] gap-3"
          >
            {(lane) => {
              const laneTasks = kanbanData.filter((t) => t.column === lane.id);
              return <KanbanBoard key={lane.id} id={lane.id} className="h-[520px] w-[280px] bg-muted/50">
                <KanbanHeader className="flex items-center gap-2 border-b px-3 py-2.5">
                  <span className={`size-2 rounded-full ${lane.dot}`} />
                  <span>{lane.name}</span>
                  <span className="ml-auto rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{laneTasks.length}</span>
                </KanbanHeader>
                <KanbanCards id={lane.id} className="gap-2 p-2">
                  {(item) => {
                    const task = visible.find((t) => String(t.id) === item.id)!;
                    return <KanbanCard key={item.id} {...item} className="mb-0 cursor-grab p-0 active:cursor-grabbing">
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
                          onPointerDown={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          onClick={() =>
                            navigate(`/projects/${task.project_id}/tasks/${task.id}`, { state: { backgroundLocation: location } })
                          }
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete task: ${task.title}`}
                          title="Delete task"
                          onPointerDown={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          onClick={() => app.requestTaskDelete(task.id, task.title)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <button
                        type="button"
                        className="block w-full text-left text-[13px] leading-snug font-medium hover:underline"
                        onPointerDown={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        onClick={() =>
                          navigate(`/projects/${task.project_id}/tasks/${task.id}`, { state: { backgroundLocation: location } })
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
                    </KanbanCard>;
                  }}
                </KanbanCards>
                {laneTasks.length === 0 && <p className="pointer-events-none absolute mt-12 w-[278px] px-4 text-center text-xs text-muted-foreground">Drop tasks here</p>}
              </KanbanBoard>;
            }}
          </KanbanProvider>
        </div>
      )}
    </div>
  );
}
