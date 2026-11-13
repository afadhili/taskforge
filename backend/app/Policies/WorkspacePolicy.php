<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Auth\Access\Response;

class WorkspacePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Workspace $workspace): bool|Response
    {
        return $user->isSuperAdmin() || $workspace->members()->whereKey($user->id)->exists() ? true : Response::denyAsNotFound();
    }

    public function create(User $user): bool
    {
        return ! $user->isViewer();
    }

    public function createProject(User $user, Workspace $workspace): bool
    {
        return $user->isSuperAdmin() || $workspace->members()->whereKey($user->id)->whereIn('workspace_members.role', ['owner', 'admin', 'member'])->exists();
    }

    public function update(User $user, Workspace $workspace): bool
    {
        return $user->isSuperAdmin() || $workspace->owner_id === $user->id || $workspace->members()->whereKey($user->id)->whereIn('workspace_members.role', ['owner', 'admin'])->exists();
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        return $user->isSuperAdmin() || $workspace->owner_id === $user->id;
    }
}
