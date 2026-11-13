import { useLocation } from "react-router-dom";
import { PanelLeft } from "lucide-react";
import { useApp } from "@/components/app-context";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Board",
  "/projects": "Projects",
  "/overview": "Overview",
  "/tasks": "Task list",
  "/team": "Team workload",
  "/analytics": "Analytics",
  "/assistant": "AI Assistant",
};

export function ShellHeader() {
  const location = useLocation();
  const app = useApp();
  const { toggleSidebar } = useSidebar();

  let title = PAGE_TITLES[location.pathname] ?? "TaskForge";
  if (location.pathname.startsWith("/projects/")) {
    const projectId = Number(location.pathname.split("/")[2]);
    title = app.projects.find((p) => p.id === projectId)?.name ?? title;
  }

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="size-7 lg:hidden" onClick={toggleSidebar}>
        <PanelLeft />
      </Button>
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <span className="truncate">{app.workspace.name}</span>
        <span className="text-border">/</span>
        <span className="truncate font-medium text-foreground">{title}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <NotificationsMenu />
      </div>
    </header>
  );
}
