<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActivityService
{
    public function forTask(Task $task, User $actor, string $action, array $properties = []): ActivityLog
    {
        return $this->record($task->project->workspace, $actor, Task::class, $task->id, $action, $properties);
    }

    public function forProject(Project $project, User $actor, string $subjectType, int $subjectId, string $action, array $properties = []): ActivityLog
    {
        return $this->record($project->workspace, $actor, $subjectType, $subjectId, $action, $properties);
    }

    public function getTaskActivity(Task $task): HasMany
    {
        return $task->project->workspace->activityLogs()
            ->where('subject_type', Task::class)
            ->where('subject_id', $task->id);
    }

    public function record(Workspace $workspace, User $actor, string $subjectType, int $subjectId, string $action, array $properties = []): ActivityLog
    {
        return $workspace->activityLogs()->create([
            'user_id' => $actor->id,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'action' => $action,
            'properties' => $properties,
        ]);
    }
}
