<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Project $project): bool|Response
    {
        return $user->isSuperAdmin() || $project->workspace->members()->whereKey($user->id)->exists() ? true : Response::denyAsNotFound();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Project $project): bool
    {
        return $user->isSuperAdmin() || $project->workspace->members()->whereKey($user->id)->whereIn('workspace_members.role', ['owner', 'admin', 'member'])->exists();
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->isSuperAdmin() || $project->workspace->members()->whereKey($user->id)->whereIn('workspace_members.role', ['owner', 'admin'])->exists();
    }
}
