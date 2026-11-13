<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;

class MemberPolicy
{
    public function manage(User $user, Workspace $workspace): bool
    {
        return $user->isSuperAdmin() || $user->isAdmin() || $workspace->owner_id === $user->id;
    }
}
