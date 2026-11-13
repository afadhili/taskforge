import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { ListTodo, Plus } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { TasksTableView } from "@/components/tasks/TasksTableView";
import type { Task } from "@/types";

export function TasksListPage() {
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

  const filtered = useMemo(() => {
    const list = tasks.data ?? [];
    const query = app.search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((task) => task.title.toLowerCase().includes(query));
  }, [tasks.data, app.search]);

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            All tasks in {project?.name ?? "your project"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Task list
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a task to edit it, or update its status here.
          </p>
        </div>
        {project && (
          <Button onClick={() => app.openTaskDialog()}>
            <Plus data-slot="icon" /> Add task
          </Button>
        )}
      </div>

      {tasks.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !project ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTodo />
              </EmptyMedia>
              <EmptyTitle>No project selected</EmptyTitle>
              <EmptyDescription>
                Pick a project first — its tasks will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTodo />
              </EmptyMedia>
              <EmptyTitle>No tasks match</EmptyTitle>
              <EmptyDescription>
                {app.search.trim()
                  ? "No tasks match the current search."
                  : "Create the first task for this project."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => app.openTaskDialog()}>
                <Plus data-slot="icon" /> Add task
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <TasksTableView projectId={project.id} tasks={filtered} />
      )}
    </div>
  );
}
