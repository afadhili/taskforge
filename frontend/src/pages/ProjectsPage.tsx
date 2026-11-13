import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/types";

type ProjectWithStats = Project & { tasks_count?: number; done_tasks_count?: number };

export function ProjectsPage() {
  const navigate = useNavigate();
  const app = useApp();

  const projects = useQuery({
    queryKey: ["projects", app.workspace.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${app.workspace.id}/projects`);
      return (res.data.data ?? []) as ProjectWithStats[];
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">All work in {app.workspace.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Projects</h1>
        </div>
        <Button onClick={() => app.openProjectDialog()}>
          <Plus data-slot="icon" /> New project
        </Button>
      </div>

      {projects.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (projects.data ?? []).length === 0 ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderKanban />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create your first project to organize work into a shared board.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => app.openProjectDialog()}>
                <Plus data-slot="icon" /> Create project
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(projects.data ?? []).map((project) => {
            const progress =
              project.progress ??
              (project.tasks_count
                ? Math.round(((project.done_tasks_count ?? 0) * 100) / project.tasks_count)
                : 0);
            const active = project.id === app.project?.id;
            return (
              <Card
                key={project.id}
                className={`cursor-pointer py-0 transition-shadow hover:shadow-md ${
                  active ? "border-primary/60 ring-1 ring-primary/30" : ""
                }`}
                onClick={() => {
                  app.setProjectId(project.id);
                  navigate("/board");
                }}
              >
                <CardContent className="flex min-h-40 flex-col p-4">
                  <div className="flex items-start justify-between">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban className="size-4" />
                    </span>
                    {active && <Badge>Your project</Badge>}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">
                    {project.description || "No description yet."}
                  </p>
                  <div className="mt-auto pt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progress}% complete</span>
                      <Badge variant="outline" className="font-semibold">{project.key}</Badge>
                    </div>
                    <Progress value={progress} className="mt-2 h-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
