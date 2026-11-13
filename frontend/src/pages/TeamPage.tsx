import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/types";

type SortKey = "open_tasks" | "estimate";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "open_tasks", label: "Open tasks" },
  { value: "estimate", label: "Estimated effort" },
];

export function TeamPage() {
  const app = useApp();
  const project = app.project;
  const [sort, setSort] = useState<SortKey>("open_tasks");

  const tasks = useQuery({
    queryKey: ["tasks", project?.id],
    queryFn: async () => {
      const res = await api.get(`/projects/${project!.id}/tasks?per_page=100`);
      return res.data.data as Task[];
    },
    enabled: !!project,
  });

  const rows = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; avatarUrl?: string | null; tasks: Task[] }
    >();
    for (const task of tasks.data ?? []) {
      if (!task.assignee || task.status === "done") continue;
      const row = map.get(task.assignee.id) ?? {
        id: task.assignee.id,
        name: task.assignee.name,
        avatarUrl: task.assignee.avatar_url,
        tasks: [],
      };
      row.tasks.push(task);
      map.set(task.assignee.id, row);
    }
    const list = [...map.values()].map((row) => ({
      id: row.id,
      name: row.name,
      avatarUrl: row.avatarUrl,
      openTasks: row.tasks.length,
      estimateHours:
        row.tasks.reduce((sum, task) => sum + task.estimate_minutes, 0) / 60,
    }));
    return list.sort((a, b) =>
      sort === "open_tasks"
        ? b.openTasks - a.openTasks
        : b.estimateHours - a.estimateHours,
    );
  }, [tasks.data, sort]);

  const max = Math.max(
    1,
    ...rows.map((row) =>
      sort === "open_tasks" ? row.openTasks : row.estimateHours,
    ),
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Project</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Team workload
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open work assigned across your project team.
          </p>
        </div>
        <Select value={sort} onValueChange={(value) => value && setSort(value)}>
          <SelectTrigger aria-label="Sort members by">
            <SelectValue>
              {(value: SortKey) =>
                SORT_OPTIONS.find((option) => option.value === value)?.label ??
                value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tasks.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>Nothing assigned</EmptyTitle>
              <EmptyDescription>
                No open tasks are assigned yet — assign tasks from the board to
                see workload here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const metric =
              sort === "open_tasks" ? row.openTasks : row.estimateHours;
            return (
              <Card key={row.id}>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={row.name} src={row.avatarUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.openTasks} open{" "}
                        {row.openTasks === 1 ? "task" : "tasks"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Estimated effort{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {row.estimateHours.toFixed(1)} hours
                    </span>
                  </p>
                  <Progress value={(metric * 100) / max} className="mt-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
