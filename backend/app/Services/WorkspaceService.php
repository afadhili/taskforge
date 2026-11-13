<?php

namespace App\Services;

use App\Models\TaskLabel;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WorkspaceService
{
    public function create(User $owner, string $name): Workspace
    {
        return DB::transaction(function () use ($owner, $name): Workspace {
            $base = Str::slug($name) ?: 'workspace';
            $slug = $base;

            while (Workspace::where('slug', $slug)->exists()) {
                $slug = $base.'-'.Str::lower(Str::random(5));
            }

            $workspace = Workspace::create([
                'name' => $name,
                'slug' => $slug,
                'owner_id' => $owner->id,
            ]);

            $workspace->members()->attach($owner->id, ['role' => 'owner']);

            return $workspace;
        });
    }

    public function members(Workspace $workspace): Collection
    {
        return $workspace
            ->members()
            ->orderBy('name')
            ->get([
                'users.id',
                'users.name',
                'users.email',
                'users.avatar_path',
                'users.oauth_avatar_url',
            ])
            ->map(
                fn (User $member): array => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'avatar_url' => $member->avatar_url,
                ],
            );
    }

    public function addMember(
        Workspace $workspace,
        User $member,
        string $role,
    ): array {
        if ($workspace->members()->whereKey($member->id)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['User is already a workspace member.'],
            ]);
        }

        $workspace->members()->attach($member->id, ['role' => $role]);

        return [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'avatar_url' => $member->avatar_url,
            'role' => $role,
        ];
    }

    public function updateMember(
        Workspace $workspace,
        User $member,
        string $role,
    ): void {
        if ($workspace->owner_id === $member->id) {
            throw ValidationException::withMessages([
                'role' => ['The workspace owner role cannot be changed.'],
            ]);
        }

        if (! $workspace->members()->whereKey($member->id)->exists()) {
            throw ValidationException::withMessages([
                'member' => ['Member not found.'],
            ]);
        }

        $workspace
            ->members()
            ->updateExistingPivot($member->id, ['role' => $role]);
    }

    public function labels(Workspace $workspace): Collection
    {
        return TaskLabel::where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get(['id', 'name', 'color']);
    }

    public function createLabel(
        Workspace $workspace,
        string $name,
        ?string $color,
    ): TaskLabel {
        return TaskLabel::create([
            'workspace_id' => $workspace->id,
            'name' => $name,
            'color' => $color ?? '#64748b',
        ]);
    }

    public function delete(Workspace $workspace): void
    {
        $workspace->delete();
    }
}
