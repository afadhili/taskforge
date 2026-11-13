import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { ProjectScopeSelect } from "@/components/ProjectScopeSelect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import { message } from "@/lib/errors";
import type { Analytics } from "@/types";
import { useQueries } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useMemo } from "react";

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

export function AnalyticsPage() {
    const app = useApp();
    const projectScope = app.projectScopeId === null ? "all" : String(app.projectScopeId);
    const project = app.projects.find(item => item.id === app.projectScopeId);
    const scopedProjects = useMemo(() => (project ? [project] : app.projects), [project, app.projects]);
    const queries = useQueries({
        queries: scopedProjects.map(item => ({
            queryKey: ["projects", item.id, "analytics"],
            queryFn: async () => (await api.get(`/projects/${item.id}/analytics`)).data.data as Analytics,
        })),
    });
    const data = useMemo<Analytics | undefined>(() => {
        if (queries.some(query => !query.data)) return undefined;
        const entries = queries.flatMap(query => (query.data ? [query.data] : []));
        const total = entries.reduce((sum, entry) => sum + entry.total_tasks, 0);
        const overdue = entries.reduce((sum, entry) => sum + entry.overdue_tasks, 0);
        const completed = entries.reduce((sum, entry) => sum + entry.completed_tasks, 0);
        const statusBreakdown: Record<string, number> = {};
        const workload = new Map<number, Analytics["workload"][number]>();
        for (const entry of entries) {
            for (const [status, count] of Object.entries(entry.status_breakdown)) {
                statusBreakdown[status] = (statusBreakdown[status] ?? 0) + count;
            }
            for (const row of entry.workload) {
                const existing = workload.get(row.user.id);
                workload.set(row.user.id, {
                    user: row.user,
                    open_tasks: row.open_tasks + (existing?.open_tasks ?? 0),
                });
            }
        }
        return {
            completion_rate: total ? Math.round((1000 * completed) / total) / 10 : 0,
            total_tasks: total,
            completed_tasks: completed,
            overdue_tasks: overdue,
            status_breakdown: statusBreakdown,
            workload: [...workload.values()].sort((a, b) => b.open_tasks - a.open_tasks),
            sprint_velocity: entries.flatMap((entry, index) =>
                entry.sprint_velocity.map(row => ({
                    ...row,
                    sprint: scopedProjects.length > 1 ? `${scopedProjects[index].name} · ${row.sprint}` : row.sprint,
                })),
            ),
            health: overdue > Math.max(3, total * 0.2) ? "at_risk" : "on_track",
        };
    }, [queries, scopedProjects]);
    const isLoading = queries.some(query => query.isLoading);
    const isError = queries.find(query => query.isError);
    const refetch = () => queries.forEach(query => void query.refetch());

    return (
        <div className="mx-auto w-full max-w-[1600px] p-6">
            <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <p className="text-xs text-muted-foreground">{project?.name ?? "All workspace projects"}</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">Analytics</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Progress, risk, and team capacity.</p>
                </div>
                <div className="flex gap-4">
                    <ProjectScopeSelect
                        value={projectScope}
                        onValueChange={value => app.setProjectScopeId(value === "all" ? null : Number(value))}
                    />
                    {data && (
                        <Badge
                            variant={data.health === "on_track" ? "secondary" : "destructive"}
                            className="h-6 px-2.5"
                        >
                            ● {data.health === "on_track" ? "On track" : "At risk"}
                        </Badge>
                    )}
                </div>
            </div>

            {app.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Select a project to see its analytics.</p>
            ) : isError ? (
                <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>Couldn't load analytics</AlertTitle>
                    <AlertDescription>{message(isError.error).message}</AlertDescription>
                    <div className="col-start-2">
                        <Button variant="outline" size="sm" onClick={refetch}>
                            Try again
                        </Button>
                    </div>
                </Alert>
            ) : isLoading || !data ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[0, 1, 2].map(i => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <StatCard label="Completion rate" value={`${data.completion_rate}%`} />
                        <StatCard label="Completed tasks" value={`${data.completed_tasks} / ${data.total_tasks}`} />
                        <StatCard label="Overdue tasks" value={data.overdue_tasks} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Completion</CardTitle>
                                <CardDescription>
                                    Share of tasks finished in {project?.name ?? "the workspace"}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{data.completion_rate}% complete</span>
                                    <span className="text-muted-foreground tabular-nums">
                                        {data.completed_tasks} of {data.total_tasks}
                                    </span>
                                </div>
                                <Progress value={data.completion_rate} className="mt-2" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Tasks by status</CardTitle>
                                <CardDescription>Where work currently sits.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {Object.entries(data.status_breakdown).map(([key, value]) => {
                                    const max = Math.max(1, ...Object.values(data.status_breakdown));
                                    return (
                                        <div key={key} className="flex items-center gap-3 text-sm">
                                            <span className="w-24 shrink-0 capitalize text-muted-foreground">
                                                {key.replace("_", " ")}
                                            </span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={{ width: `${(Number(value) * 100) / max}%` }}
                                                />
                                            </div>
                                            <span className="w-6 text-right font-medium tabular-nums">
                                                {String(value)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Team workload</CardTitle>
                                <CardDescription>Open tasks per member.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.workload.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No open tasks assigned yet.</p>
                                ) : (
                                    <ul className="divide-y divide-border/60">
                                        {data.workload.map(row => (
                                            <li
                                                key={row.user.id}
                                                className="flex items-center justify-between gap-3 py-2 text-sm"
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <UserAvatar
                                                        name={row.user.name}
                                                        src={row.user.avatar_url}
                                                        size="sm"
                                                    />
                                                    <span className="truncate font-medium">{row.user.name}</span>
                                                </span>
                                                <span className="shrink-0 text-muted-foreground tabular-nums">
                                                    {row.open_tasks} open {row.open_tasks === 1 ? "task" : "tasks"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Sprint velocity</CardTitle>
                                <CardDescription>Tasks completed per sprint.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.sprint_velocity.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Complete a sprint to track velocity.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-border/60">
                                        {data.sprint_velocity.map(row => (
                                            <li
                                                key={row.sprint}
                                                className="flex items-center justify-between gap-3 py-2 text-sm"
                                            >
                                                <span className="truncate font-medium">{row.sprint}</span>
                                                <span className="shrink-0 text-muted-foreground tabular-nums">
                                                    {row.completed} completed
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
