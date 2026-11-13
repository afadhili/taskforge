<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskLabel;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TaskService
{
    public function __construct(
        private readonly ActivityService $activity,
        private readonly NotificationService $notifications,
    ) {}

    public function create(User $actor, int $projectId, array $attributes): Task
    {
        return DB::transaction(function () use ($actor, $projectId, $attributes): Task {
            $labelIds = $attributes['label_ids'] ?? [];
            unset($attributes['label_ids']);

            $project = Project::with('workspace')->findOrFail($projectId);

            if ($labelIds !== [] && $this->invalidLabelIds($labelIds, $project->workspace_id)) {
                throw ValidationException::withMessages(['label_ids' => ['Labels must belong to this workspace.']]);
            }

            $task = Task::create($attributes + ['project_id' => $projectId, 'created_by' => $actor->id]);

            $this->activity->forTask($task, $actor, 'created');

            if ($labelIds !== []) {
                $task->labels()->sync($labelIds);
            }

            if (isset($attributes['assignee_id'])) {
                $this->notifyAssignment($task, $actor);
            }

            return $task->load(['assignee', 'dependencies']);
        });
    }

    public function update(User $actor, Task $task, array $attributes): Task
    {
        return DB::transaction(function () use ($actor, $task, $attributes): Task {
            $old = $task->only(['status', 'assignee_id']);

            $labelIds = $attributes['label_ids'] ?? null;
            unset($attributes['label_ids']);

            $task->update($attributes);

            if ($labelIds !== null) {
                if ($this->invalidLabelIds($labelIds, $task->project->workspace_id)) {
                    throw ValidationException::withMessages(['label_ids' => ['Labels must belong to this workspace.']]);
                }

                $task->labels()->sync($labelIds);
            }

            $changes = array_intersect_key($task->getChanges(), array_flip(['title', 'description', 'status', 'priority', 'assignee_id', 'deadline', 'estimate_minutes', 'position']));

            if ($changes !== []) {
                $this->activity->forTask($task, $actor, 'updated', ['changes' => $changes]);
            }

            if (isset($changes['assignee_id']) && $task->assignee_id) {
                $this->notifyAssignment($task, $actor);
            }

            if (isset($changes['status'])) {
                $this->notifyProjectMembers($task, $actor, 'task_status_changed', ['from' => $old['status'], 'to' => $task->status]);
            }

            return $task->refresh()->load(['assignee', 'dependencies']);
        });
    }

    public function setDependencies(User $actor, Task $task, array $dependencyIds): Task
    {
        $dependencyIds = array_values(array_unique(array_map('intval', $dependencyIds)));

        if (in_array($task->id, $dependencyIds, true)) {
            throw ValidationException::withMessages(['dependencies' => ['A task cannot depend on itself.']]);
        }

        $dependencies = Task::whereIn('id', $dependencyIds)->get();

        if ($dependencies->count() !== count($dependencyIds) || $dependencies->contains(fn (Task $item): bool => $item->project_id !== $task->project_id)) {
            throw ValidationException::withMessages(['dependencies' => ['Dependencies must be tasks in the same project.']]);
        }

        foreach ($dependencyIds as $dependencyId) {
            if ($this->reaches($dependencyId, $task->id)) {
                throw ValidationException::withMessages(['dependencies' => ['This relationship would create a circular dependency.']]);
            }
        }

        DB::transaction(function () use ($task, $dependencyIds, $actor): void {
            $task->dependencies()->sync($dependencyIds);
            $this->activity->forTask($task, $actor, 'dependencies_updated', ['dependency_ids' => $dependencyIds]);
        });

        return $task->refresh()->load('dependencies');
    }

    public function addComment(User $actor, Task $task, string $body): Comment
    {
        $comment = $task->comments()->create(['user_id' => $actor->id, 'body' => $body]);

        $this->activity->forTask($task, $actor, 'commented', ['comment_id' => $comment->id]);

        return $comment;
    }

    public function addAttachment(Task $task, User $actor, UploadedFile $file): Attachment
    {
        $path = $file->store('task-attachments/'.$task->id, 'local');

        $attachment = $task->attachments()->create([
            'uploaded_by' => $actor->id,
            'disk' => 'local',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize(),
        ]);

        $this->activity->forTask($task, $actor, 'attachment_added');

        return $attachment;
    }

    private function invalidLabelIds(array $labelIds, int $workspaceId): bool
    {
        return TaskLabel::whereIn('id', $labelIds)->where('workspace_id', $workspaceId)->count() !== count($labelIds);
    }

    private function notifyAssignment(Task $task, User $actor): void
    {
        if ($task->assignee_id === $actor->id) {
            return;
        }

        $this->notifications->create($task->assignee, 'task_assigned', ['task_id' => $task->id, 'title' => $task->title]);
    }

    private function notifyProjectMembers(Task $task, User $actor, string $type, array $details): void
    {
        foreach ($task->project->workspace->members()->where('users.id', '!=', $actor->id)->get() as $member) {
            $this->notifications->create($member, $type, ['task_id' => $task->id, 'title' => $task->title] + $details);
        }
    }

    private function reaches(int $fromId, int $targetId): bool
    {
        $pending = [$fromId];
        $visited = [];

        while ($pending !== []) {
            $id = array_pop($pending);

            if ($id === $targetId) {
                return true;
            }

            if (isset($visited[$id])) {
                continue;
            }

            $visited[$id] = true;

            $pending = array_merge($pending, Task::find($id)?->dependencies()->pluck('tasks.id')->all() ?? []);
        }

        return false;
    }
}
