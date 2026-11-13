import { api, setToken } from "@/api";
import { AppProvider, type AppContextValue, type AppDialog } from "@/components/app-context";
import { CreateWorkspace } from "@/components/auth/CreateWorkspace";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { SettingsDialog } from "@/components/dialogs/SettingsDialog";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { QueryFailure } from "@/components/layout/QueryFailure";
import { ShellHeader } from "@/components/layout/ShellHeader";
import { TaskDetails } from "@/components/tasks/TaskDetails";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/errors";
import type { Project } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { FolderKanban, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useNavigate, type Location } from "react-router-dom";
import { toast } from "sonner";

type User = {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
    has_custom_avatar?: boolean;
    oauth_provider?: "google" | "github" | null;
};
type Workspace = { id: number; name: string; slug?: string; role?: "owner" | "admin" | "member" | "viewer" };
type DeleteDropItem = { type: "project" | "task"; id: number; name: string };
const DELETE_DRAG_TYPE = "application/x-taskforge-delete-item";
function readStoredUser(): User | null {
    try {
        return JSON.parse(localStorage.getItem("tf_user") || "null") as User | null;
    } catch {
        return null;
    }
}

export function AppShell({ modalLocation }: { modalLocation?: Location | null }) {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const modalTaskId = modalLocation?.pathname.match(/\/projects\/\d+\/tasks\/(\d+)$/)?.[1];
    const modalHasBackground = Boolean(
        (modalLocation?.state as { backgroundLocation?: unknown } | null)?.backgroundLocation,
    );

    const [user, setUserState] = useState<User | null>(readStoredUser);
    const authUser = useQuery({
        queryKey: ["auth-user"],
        enabled: !!user,
        queryFn: async () => (await api.get("/auth/me")).data.data as User,
    });
    const authUnauthorized = isAxiosError(authUser.error) && authUser.error.response?.status === 401;
    const currentUser = authUser.data ?? user;

    useEffect(() => {
        if (authUser.data) {
            localStorage.setItem("tf_user", JSON.stringify(authUser.data));
        }
    }, [authUser.data]);

    useEffect(() => {
        if (!authUnauthorized) return;
        setToken(null);
        localStorage.removeItem("tf_user");
        qc.clear();
    }, [authUnauthorized, qc]);

    const [workspaceId, setWorkspaceIdState] = useState(() => Number(localStorage.getItem("tf_workspace") || 0));
    const [projectId, setProjectIdState] = useState(() => Number(localStorage.getItem("tf_project") || 0));
    const [projectScopeId, setProjectScopeIdState] = useState<number | null | undefined>(() => {
        const savedScope = localStorage.getItem("tf_project_scope");
        if (savedScope === "all") return null;
        if (savedScope) return Number(savedScope);
        return undefined;
    });
    const [search, setSearch] = useState("");
    const [dialog, setDialog] = useState<AppDialog>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
    const [draggingDelete, setDraggingDelete] = useState<DeleteDropItem["type"] | null>(null);
    const [pendingDelete, setPendingDelete] = useState<DeleteDropItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const workspaces = useQuery({
        queryKey: ["workspaces"],
        enabled: !!user && authUser.isSuccess,
        queryFn: async () => (await api.get("/workspaces")).data.data as Workspace[],
    });

    const workspace = useMemo(
        () => workspaces.data?.find(w => w.id === workspaceId) ?? workspaces.data?.[0],
        [workspaces.data, workspaceId],
    );
    const ownedWorkspaceCount = workspaces.data?.filter(item => item.role === "owner").length ?? 0;
    const canCreateWorkspace = ownedWorkspaceCount < 2;

    useEffect(() => {
        if (workspace && workspace.id !== workspaceId) {
            localStorage.setItem("tf_workspace", String(workspace.id));
            setWorkspaceIdState(workspace.id);
            setProjectIdState(0);
        }
    }, [workspace, workspaceId]);

    const projects = useQuery({
        queryKey: ["projects", workspace?.id],
        enabled: !!workspace,
        queryFn: async () => (await api.get(`/workspaces/${workspace!.id}/projects`)).data.data as Project[],
    });

    const project = useMemo(
        () => projects.data?.find(p => p.id === projectId) ?? projects.data?.[0],
        [projects.data, projectId],
    );

    useEffect(() => {
        if (project && project.id !== projectId) {
            localStorage.setItem("tf_project", String(project.id));
            setProjectIdState(project.id);
        }
    }, [project, projectId]);

    const confirmDelete = async () => {
        if (!pendingDelete || !workspace) return;
        setDeleting(true);
        try {
            if (pendingDelete.type === "task") {
                await api.delete(`/tasks/${pendingDelete.id}`);
                qc.removeQueries({ queryKey: ["/tasks", pendingDelete.id] });
                await qc.invalidateQueries({ queryKey: ["tasks"] });
            } else {
                const deletingCurrentProject = project?.id === pendingDelete.id;
                await api.delete(`/projects/${pendingDelete.id}`);
                await qc.invalidateQueries({ queryKey: ["projects", workspace.id] });
                await qc.invalidateQueries({ queryKey: ["tasks"] });
                if (deletingCurrentProject) {
                    const remainingProjects = qc.getQueryData<Project[]>(["projects", workspace.id]) ?? [];
                    const nextProject = remainingProjects[0];
                    if (nextProject) {
                        localStorage.setItem("tf_project", String(nextProject.id));
                        setProjectIdState(nextProject.id);
                    } else {
                        localStorage.removeItem("tf_project");
                        setProjectIdState(0);
                    }
                    navigate("/projects");
                }
            }
            toast.success(`${pendingDelete.type === "task" ? "Task" : "Project"} deleted`);
            setPendingDelete(null);
        } catch (error) {
            const failure = message(error);
            toast.error(failure.message, { description: failure.hint });
        } finally {
            setDeleting(false);
        }
    };

    const signOut = async () => {
        await api.post("/auth/logout").catch(() => undefined);
        delete api.defaults.headers.Authorization;
        localStorage.removeItem("tf_user");
        localStorage.removeItem("tf_token");
        qc.clear();
        navigate("/login");
    };

    const context: AppContextValue = {
        user: currentUser ?? { id: 0, name: "", email: "" },
        setUser: next => {
            localStorage.setItem("tf_user", JSON.stringify(next));
            setUserState(next);
            qc.setQueryData(["auth-user"], next);
        },
        signOut,
        workspace: workspace ?? { id: 0, name: "" },
        workspaces: workspaces.data ?? [],
        canCreateWorkspace,
        openCreateWorkspace: () => setCreateWorkspaceOpen(true),
        setWorkspaceId: id => {
            localStorage.setItem("tf_workspace", String(id));
            setWorkspaceIdState(id);
            setProjectIdState(0);
            setProjectScopeIdState(undefined);
            localStorage.removeItem("tf_project_scope");
            qc.invalidateQueries({ queryKey: ["projects"] });
        },
        project,
        projects: projects.data ?? [],
        setProjectId: id => {
            localStorage.setItem("tf_project", String(id));
            setProjectIdState(id);
            localStorage.setItem("tf_project_scope", String(id));
            setProjectScopeIdState(id);
        },
        projectScopeId: projectScopeId === undefined ? (project?.id ?? null) : projectScopeId,
        setProjectScopeId: id => {
            localStorage.setItem("tf_project_scope", id === null ? "all" : String(id));
            setProjectScopeIdState(id);
        },
        search,
        setSearch,
        dialog,
        openProjectDialog: editProject => setDialog({ kind: "project", project: editProject }),
        openTaskDialog: () => setDialog({ kind: "task" }),
        requestTaskDelete: (id, name) => setPendingDelete({ type: "task", id, name }),
        closeDialog: () => setDialog(null),
        settingsOpen,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
    };

    if (!user || authUnauthorized) return <Navigate to="/login" replace />;

    if (authUser.isLoading) {
        return (
            <div className="flex min-h-svh items-center justify-center gap-3 text-muted-foreground">
                <Spinner className="size-5" /> Checking your session…
            </div>
        );
    }

    if (authUser.isError) {
        return (
            <QueryFailure
                title="Couldn't verify your session"
                error={authUser.error}
                retry={() => authUser.refetch()}
            />
        );
    }

    if (workspaces.isLoading) {
        return (
            <div className="flex min-h-svh items-center justify-center gap-3 text-muted-foreground">
                <Spinner className="size-5" /> Loading your workspace…
            </div>
        );
    }

    if (workspaces.isError) {
        return (
            <QueryFailure
                title="Couldn't load your workspace"
                error={workspaces.error}
                retry={() => workspaces.refetch()}
            />
        );
    }

    if (!workspace && createWorkspaceOpen) {
        return (
            <CreateWorkspace
                user={user}
                onCreated={item => {
                    localStorage.setItem("tf_workspace", String(item.id));
                    setWorkspaceIdState(item.id);
                    setCreateWorkspaceOpen(false);
                    qc.invalidateQueries({ queryKey: ["workspaces"] });
                }}
                onLogout={signOut}
                onCancel={() => setCreateWorkspaceOpen(false)}
            />
        );
    }

    if (!workspace) {
        return (
            <AppProvider value={context}>
                <div className="flex min-h-svh flex-col">
                    <header className="flex h-14 items-center justify-between border-b px-5">
                        <span className="font-semibold tracking-tight">TaskForge</span>
                        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                            Sign out
                        </Button>
                    </header>
                    <main className="grid flex-1 place-items-center p-6">
                        <Card className="w-full max-w-lg">
                            <CardHeader className="flex flex-col items-center justify-center text-center">
                                <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary">
                                    <FolderKanban className="size-6" />
                                </span>
                                <CardTitle className="text-2xl">
                                    Welcome to TaskForge, {user.name.split(" ")[0]}
                                </CardTitle>
                                <CardDescription className="max-w-sm">
                                    You’re signed in. Create a workspace when you’re ready, or open an invitation link
                                    to join one.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <Button onClick={() => setCreateWorkspaceOpen(true)}>
                                    <FolderKanban data-slot="icon" /> Create a workspace
                                </Button>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </AppProvider>
        );
    }

    return (
        <AppProvider value={context}>
            <SidebarProvider>
                <div
                    className="flex min-h-svh w-full"
                    onDragStart={event => {
                        if (event.dataTransfer.types.includes(DELETE_DRAG_TYPE)) {
                            setDraggingDelete("task");
                            try {
                                const item = JSON.parse(event.dataTransfer.getData(DELETE_DRAG_TYPE)) as DeleteDropItem;
                                setDraggingDelete(item.type);
                            } catch {
                                setDraggingDelete(null);
                            }
                        }
                    }}
                    onDragEnd={() => setDraggingDelete(null)}
                >
                    <AppSidebar />
                    <div className="workspace-canvas flex min-w-0 flex-1 flex-col">
                        <ShellHeader />
                        <Outlet />
                        {modalTaskId && (
                            <TaskDetails
                                taskId={Number(modalTaskId)}
                                onClose={() => {
                                    if (modalHasBackground) navigate(-1);
                                    else navigate("/board", { replace: true });
                                }}
                            />
                        )}
                    </div>
                </div>

                {draggingDelete && (
                    <div
                        role="button"
                        aria-label={`Drop ${draggingDelete} here to delete`}
                        className="fixed right-3 top-1/2 z-40 flex min-h-32 w-24 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-destructive bg-destructive/10 p-3 text-center text-destructive shadow-lg transition-colors data-[drag-over=true]:bg-destructive/20"
                        onDragOver={event => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            event.currentTarget.dataset.dragOver = "true";
                        }}
                        onDragLeave={event => {
                            delete event.currentTarget.dataset.dragOver;
                        }}
                        onDrop={event => {
                            event.preventDefault();
                            delete event.currentTarget.dataset.dragOver;
                            setDraggingDelete(null);
                            try {
                                const item = JSON.parse(event.dataTransfer.getData(DELETE_DRAG_TYPE)) as DeleteDropItem;
                                if ((item.type === "task" || item.type === "project") && Number.isInteger(item.id)) {
                                    setPendingDelete(item);
                                }
                            } catch {
                                toast.error("Could not identify the item to delete");
                            }
                        }}
                    >
                        <Trash2 className="size-6" />
                        <span className="text-xs font-semibold">Drop to delete</span>
                        <span className="text-[10px]">{draggingDelete === "project" ? "Project" : "Task"}</span>
                    </div>
                )}

                <AlertDialog
                    open={!!pendingDelete}
                    onOpenChange={open => {
                        if (!open && !deleting) setPendingDelete(null);
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {pendingDelete?.type}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {pendingDelete?.type === "project"
                                    ? `“${pendingDelete.name}” and all of its tasks will be permanently deleted.`
                                    : `“${pendingDelete?.name}” will be permanently deleted.`}{" "}
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                disabled={deleting}
                                onClick={() => void confirmDelete()}
                            >
                                {deleting ? "Deleting…" : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {dialog?.kind === "project" && (
                    <ProjectDialog
                        project={dialog.project}
                        close={context.closeDialog}
                        created={item => {
                            context.closeDialog();
                            context.setProjectId(item.id);
                            qc.invalidateQueries({ queryKey: ["projects", workspace.id] });
                            navigate("/board");
                        }}
                    />
                )}
                {dialog?.kind === "task" && project && (
                    <TaskDialog
                        projectId={project.id}
                        close={context.closeDialog}
                        created={() => {
                            context.closeDialog();
                            qc.invalidateQueries({ queryKey: ["tasks", project.id] });
                            qc.invalidateQueries({ queryKey: ["projects", workspace.id] });
                        }}
                    />
                )}
                {createWorkspaceOpen && canCreateWorkspace && (
                    <CreateWorkspace
                        user={currentUser ?? user}
                        asDialog
                        onCreated={item => {
                            localStorage.setItem("tf_workspace", String(item.id));
                            setWorkspaceIdState(item.id);
                            setProjectIdState(0);
                            setCreateWorkspaceOpen(false);
                            void qc.invalidateQueries({ queryKey: ["workspaces"] });
                        }}
                        onLogout={signOut}
                        onCancel={() => setCreateWorkspaceOpen(false)}
                    />
                )}
                <SettingsDialog open={context.settingsOpen} close={context.closeSettings} />
            </SidebarProvider>
        </AppProvider>
    );
}
