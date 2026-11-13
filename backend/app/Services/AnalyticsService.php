<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Collection;

class AnalyticsService
{
    public function forProject(Project $project): array
    {
        $tasks = $project->tasks();

        $total = $tasks->count();
        $done = $tasks->where('status', 'done')->count();
        $overdue = $tasks
            ->whereNotNull('deadline')
            ->whereDate('deadline', '<', now()->toDateString())
            ->where('status', '!=', 'done')
            ->count();

        $status = $tasks
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $workload = $this->workload($project);
        $velocity = $this->velocity($project);

        return [
            'completion_rate' => $total === 0 ? 0 : round((100 * $done) / $total, 1),
            'total_tasks' => $total,
            'completed_tasks' => $done,
            'overdue_tasks' => $overdue,
            'status_breakdown' => $status,
            'workload' => $workload,
            'sprint_velocity' => $velocity,
            'health' => $overdue > max(3, $total * 0.2) ? 'at_risk' : 'on_track',
        ];
    }

    private function workload(Project $project): Collection
    {
        return $project->workspace
            ->members()
            ->withCount([
                'assignedTasks as open_tasks_count' => function ($query) use (
                    $project,
                ): void {
                    $query
                        ->where('project_id', $project->id)
                        ->where('status', '!=', 'done');
                },
            ])
            ->get([
                'users.id',
                'users.name',
                'users.email',
                'users.avatar_path',
                'users.oauth_avatar_url',
            ])
            ->map(
                fn ($user) => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'avatar_url' => $user->avatar_url,
                    ],
                    'open_tasks' => $user->open_tasks_count,
                ],
            );
    }

    private function velocity(Project $project): Collection
    {
        return $project
            ->sprints()
            ->where('status', 'completed')
            ->with('tasks')
            ->get()
            ->map(
                fn ($sprint) => [
                    'sprint' => $sprint->name,
                    'completed' => $sprint->tasks
                        ->where('status', 'done')
                        ->count(),
                ],
            );
    }
}
