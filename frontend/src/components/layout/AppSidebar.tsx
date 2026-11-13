import { useApp } from "@/components/app-context";
import { useTheme } from "@/components/ThemeContext";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import {
    Activity,
    Check,
    ChevronDown,
    FolderKanban,
    LayoutDashboard,
    ListTodo,
    LogOut,
    MoonStar,
    PanelsTopLeft,
    Plus,
    Settings,
    Sparkles,
    Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const DELETE_DRAG_TYPE = "application/x-taskforge-delete-item";

const NAV_ITEMS = [
    {
        to: "/overview",
        label: "Overview",
        icon: LayoutDashboard,
        match: (path: string) => path === "/overview" || path.startsWith("/projects/"),
    },
    {
        to: "/projects",
        label: "Projects",
        icon: FolderKanban,
        match: (path: string) => path === "/projects",
    },
    {
        to: "/board",
        label: "My tasks",
        icon: ListTodo,
        match: (path: string) => path === "/" || path === "/tasks",
    },
    {
        to: "/team",
        label: "Team workload",
        icon: Users,
        match: (path: string) => path === "/team",
    },
    {
        to: "/analytics",
        label: "Analytics",
        icon: Activity,
        match: (path: string) => path === "/analytics",
    },
    {
        to: "/assistant",
        label: "AI Assistant",
        icon: Sparkles,
        match: (path: string) => path === "/assistant",
    },
] as const;

export function AppSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const app = useApp();
    const { theme, setTheme } = useTheme();
    const { state } = useSidebar();

    const selectProject = (id: number) => {
        app.setProjectId(id);
        navigate("/board");
    };

    return (
        <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
            <SidebarHeader>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent">
                                <span
                                    className={cn(
                                        "grid place-items-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/20",
                                        state === "collapsed" ? "size-4 " : "size-6",
                                    )}
                                >
                                    <PanelsTopLeft className="size-4" />
                                </span>
                                <span className="grid flex-1 text-left leading-tight">
                                    <span className="truncate text-sm font-bold tracking-tight">
                                        {app.workspace.name}
                                    </span>
                                    <span className="truncate text-[11px] font-medium tracking-wide text-muted-foreground">
                                        TEAM WORKSPACE
                                    </span>
                                </span>
                                <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                            </SidebarMenuButton>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-(--anchor-width)">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                            {app.workspaces.map(item => (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={() => app.setWorkspaceId(item.id)}
                                    data-active={item.id === app.workspace.id}
                                >
                                    {item.name}
                                    {item.id === app.workspace.id && <Check className="ml-auto size-4" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {NAV_ITEMS.map(item => (
                                <SidebarMenuItem key={item.to}>
                                    <SidebarMenuButton
                                        isActive={item.match(location.pathname)}
                                        tooltip={item.label}
                                        className="h-9 rounded-lg text-[13px] transition-colors data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground data-active:shadow-sm"
                                        onClick={() => navigate(item.to)}
                                    >
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Projects
                    </SidebarGroupLabel>
                    <SidebarGroupAction title="New project" onClick={() => app.openProjectDialog()}>
                        <Plus />
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        {state === "expanded" && (
                            <SidebarMenu>
                                {app.projects.map(item => (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            isActive={item.id === app.project?.id}
                                            tooltip={item.name}
                                            className="h-9 rounded-lg text-[13px] transition-colors data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-accent-foreground"
                                            draggable
                                            onDragStart={event => {
                                                event.dataTransfer.effectAllowed = "move";
                                                event.dataTransfer.setData(
                                                    DELETE_DRAG_TYPE,
                                                    JSON.stringify({
                                                        type: "project",
                                                        id: item.id,
                                                        name: item.name,
                                                    }),
                                                );
                                            }}
                                            onClick={() => selectProject(item.id)}
                                        >
                                            <span className="size-2 rounded-[3px] border-2 border-primary" />
                                            <span className="truncate">{item.name}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                                {app.projects.length === 0 && (
                                    <p className="px-2 py-1 text-xs text-muted-foreground">No projects yet</p>
                                )}
                            </SidebarMenu>
                        )}
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Settings" onClick={app.openSettings}>
                            <Settings />
                            <span>Settings</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="flex items-center gap-2 border-t border-sidebar-border py-4">
                    <UserAvatar name={app.user.name} src={app.user.avatar_url} className="size-8" />
                    <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate text-xs font-semibold">{app.user.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{app.user.email}</span>
                    </div>
                    <div className="flex gap-1 group-data-[collapsible=icon]:hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Toggle theme"
                            aria-label="Toggle color theme"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            <MoonStar className="size-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Sign out"
                            aria-label="Sign out"
                            onClick={() => void app.signOut()}
                        >
                            <LogOut className="size-3.5" />
                        </Button>
                    </div>
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
