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

    public function invite(User $user, Workspace $workspace, string $role = 'member'): bool
    {
        $memberRole = $workspace->members()->whereKey($user->id)->value('workspace_members.role');
        $canInvite = $user->isSuperAdmin() || in_array($memberRole, ['owner', 'admin', 'member'], true);
        $canInviteAsAdmin = $user->isSuperAdmin() || $workspace->owner_id === $user->id || in_array($memberRole, ['owner', 'admin'], true);

        return $canInvite && ($role !== 'admin' || $canInviteAsAdmin);
    }

    public function removeMember(User $user, Workspace $workspace, User $member): bool
    {
        if ($member->id === $user->id || $member->id === $workspace->owner_id) {
            return false;
        }

        if ($user->isSuperAdmin() || $workspace->owner_id === $user->id) {
            return true;
        }

        $actorRole = $workspace->members()->whereKey($user->id)->value('workspace_members.role');
        $memberRole = $workspace->members()->whereKey($member->id)->value('workspace_members.role');

        return $actorRole === 'admin' && in_array($memberRole, ['member', 'viewer'], true);
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        return $user->isSuperAdmin() || $workspace->owner_id === $user->id;
    }
}
