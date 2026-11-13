<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool|Response
    {
        return $user->isSuperAdmin() || $task->project->workspace->members()->whereKey($user->id)->exists() ? true : Response::denyAsNotFound();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Task $task): bool
    {
        return $user->isSuperAdmin() || $task->project->workspace->members()->whereKey($user->id)->whereIn('workspace_members.role', ['owner', 'admin', 'member'])->exists();
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->isSuperAdmin() || $task->project->workspace->members()->whereKey($user->id)->whereIn('workspace_members.role', ['owner', 'admin'])->exists();
    }
}
