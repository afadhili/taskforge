<?php

namespace Tests;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * The auth manager caches resolved guards (and their users) across the
     * multiple HTTP requests a single test makes, so a token from an earlier
     * request would keep authenticating as the first user. Flush guards so
     * each request resolves auth from its own token.
     */
    public function withToken($token, $type = 'Bearer')
    {
        $this->app->make('auth')->forgetGuards();

        return parent::withToken($token, $type);
    }

    protected function signIn(?User $user = null): User
    {
        $user = $user ?? User::factory()->create();
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    protected function createUser(array $overrides = []): User
    {
        return User::factory()->create($overrides);
    }

    protected function createWorkspace(array $overrides = [], ?User $owner = null): Workspace
    {
        $owner = $owner ?? ($overrides['owner'] ?? $this->createUser(['role' => 'owner']));
        $workspace = Workspace::create([
            'name' => $overrides['name'] ?? 'Test Workspace',
            'slug' => strtolower(str_replace(' ', '-', $overrides['name'] ?? 'test-workspace')),
            'owner_id' => $owner->id,
        ]);
        $workspace->members()->attach($owner->id, ['role' => 'owner']);

        return $workspace;
    }
}
