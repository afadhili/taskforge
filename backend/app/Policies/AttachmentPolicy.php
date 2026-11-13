<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AttachmentPolicy
{
    public function view(User $user, Attachment $attachment): bool|Response
    {
        return $user->isSuperAdmin()
            || $attachment->task->project->workspace->members()->whereKey($user->id)->exists()
            ? true
            : Response::denyAsNotFound();
    }

    public function delete(User $user, Attachment $attachment): bool
    {
        if ($user->isSuperAdmin() || $attachment->uploaded_by === $user->id) {
            return true;
        }

        return $attachment->task->project->workspace->members()
            ->whereKey($user->id)
            ->whereIn('workspace_members.role', ['owner', 'admin'])
            ->exists();
    }
}
