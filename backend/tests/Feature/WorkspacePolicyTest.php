<?php

use App\Models\User;
use App\Services\WorkspaceService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(LazilyRefreshDatabase::class);

it('grants workspace access according to each workspace role', function (): void {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $viewer = User::factory()->create();
    $platformAdmin = User::factory()->create(['role' => 'super_admin']);
    $workspace = app(WorkspaceService::class)->create($owner, 'Permissions');
    $workspace->members()->attach($admin->id, ['role' => 'admin']);
    $workspace->members()->attach($member->id, ['role' => 'member']);
    $workspace->members()->attach($viewer->id, ['role' => 'viewer']);

    $permissions = fn (User $user): array => [
        Gate::forUser($user)->allows('view', $workspace),
        Gate::forUser($user)->allows('update', $workspace),
        Gate::forUser($user)->allows('delete', $workspace),
    ];

    expect($permissions($owner))->toBe([true, true, true])
        ->and($permissions($admin))->toBe([true, true, false])
        ->and($permissions($member))->toBe([true, false, false])
        ->and($permissions($viewer))->toBe([true, false, false])
        ->and(Gate::forUser($platformAdmin)->allows('view', $workspace))->toBeTrue();
});
