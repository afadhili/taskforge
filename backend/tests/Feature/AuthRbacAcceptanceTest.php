<?php

use App\Models\Invitation;
use App\Models\User;

use function Pest\Laravel\getJson;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;
use function Pest\Laravel\put;

it('registers a user', function () {
    $response = post('/api/v1/auth/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['data' => ['user', 'token']])
        ->assertJsonPath('data.user.email', 'ada@example.com');

    $this->assertDatabaseHas('users', ['email' => 'ada@example.com']);
});

it('rejects duplicate email on registration', function () {
    User::factory()->create(['email' => 'dup@example.com']);
    $response = post('/api/v1/auth/register', [
        'name' => 'Ada',
        'email' => 'dup@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);
    $response->assertStatus(422);
});

it('rejects short password on registration', function () {
    $response = post('/api/v1/auth/register', [
        'name' => 'Ada',
        'email' => 'short@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ]);
    $response->assertStatus(422);
});

it('logs in a user', function () {
    $user = User::factory()->create(['password' => bcrypt('password123')]);
    $response = post('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['user', 'token']]);

    $this->assertNotNull($user->fresh()->fresh('tokens')->tokens->first());
});

it('rejects login with wrong password', function () {
    $user = User::factory()->create(['password' => bcrypt('password123')]);
    $response = post('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrongpass',
    ]);
    $response->assertStatus(401);
});

it('logs out and returns the current user', function () {
    $user = $this->createUser();
    $plainToken = $user->createToken('logout-test')->plainTextToken;
    $tokenId = $user->tokens()->where('name', 'logout-test')->value('id');
    $headers = ['Authorization' => 'Bearer '.$plainToken];

    $response = post('/api/v1/auth/logout', [], $headers);
    $response->assertStatus(200);

    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
});

it('updates the profile', function () {
    $user = $this->signIn();
    $response = patch('/api/v1/auth/profile', [
        'name' => 'Ada Updated',
    ]);
    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Ada Updated');
});

it('rotates the password and invalidates tokens', function () {
    $user = User::factory()->create(['password' => bcrypt('OldPass123')]);
    $token = $user->createToken('t')->plainTextToken;
    $tokenId = $user->tokens()->where('name', 't')->value('id');

    $response = put('/api/v1/auth/password', [
        'current_password' => 'OldPass123',
        'password' => 'NewPass123',
        'password_confirmation' => 'NewPass123',
    ], ['Authorization' => 'Bearer '.$token]);

    $response->assertStatus(200);
    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);

    auth()->forgetGuards();
    $response = getJson('/api/v1/auth/me', ['Authorization' => 'Bearer '.$token]);
    $response->assertStatus(401);
});

it('blocks an unauthorized user from creating a workspace', function () {
    $user = $this->createUser(['role' => 'viewer']);
    $response = post('/api/v1/workspaces', ['name' => 'Nope'], ['Authorization' => 'Bearer '.$user->createToken('t')->plainTextToken]);
    $response->assertStatus(403);
});

it('allows an admin to create a workspace', function () {
    $user = $this->createUser(['role' => 'admin']);
    $response = post('/api/v1/workspaces', ['name' => 'Admin ws'], ['Authorization' => 'Bearer '.$user->createToken('t')->plainTextToken]);
    $response->assertStatus(201);
});

it('blocks a viewer from creating a project', function () {
    $user = $this->createUser(['role' => 'viewer']);
    $workspace = $this->createWorkspace(['owner' => $user]);
    $workspace->members()->updateExistingPivot($user->id, ['role' => 'viewer']);
    $response = post("/api/v1/workspaces/{$workspace->id}/projects", ['name' => 'P', 'key' => 'P1'], ['Authorization' => 'Bearer '.$user->createToken('t')->plainTextToken]);
    $response->assertStatus(403);
});

it('allows an admin to invite a member', function () {
    $admin = $this->createUser(['role' => 'admin']);
    $workspace = $this->createWorkspace(['owner' => $admin]);
    $invitee = $this->createUser(['email' => 'invitee@example.com']);
    $response = post("/api/v1/workspaces/{$workspace->id}/invitations", ['email' => $invitee->email, 'role' => 'member'], ['Authorization' => 'Bearer '.$admin->createToken('t')->plainTextToken]);
    $response->assertStatus(201);
    $this->assertDatabaseHas('invitations', ['workspace_id' => $workspace->id, 'email' => 'invitee@example.com']);
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $invitee->id,
        'type' => 'workspace_invitation',
    ]);
});

it('rejects an uninvited user accepting an invitation', function () {
    $workspace = $this->createWorkspace(['owner' => $this->createUser()]);
    $invitation = Invitation::create([
        'workspace_id' => $workspace->id,
        'invited_by' => $workspace->owner_id,
        'email' => 'other@example.com',
        'role' => 'member',
        'token_hash' => hash('sha256', 'tok'),
        'expires_at' => now()->addDays(7),
    ]);
    $user = $this->createUser(['email' => 'other@example.com']);
    $user->update(['email' => 'uninvited@example.com']);
    $response = post("/api/v1/invitations/{$invitation->token_hash}/accept", [], ['Authorization' => 'Bearer '.$user->createToken('t')->plainTextToken]);
    $response->assertStatus(403);
});

it('a valid invitation accept links the user to the workspace', function () {
    $owner = $this->createUser(['role' => 'owner']);
    $workspace = $this->createWorkspace(['owner' => $owner]);
    $invitation = Invitation::create([
        'workspace_id' => $workspace->id,
        'invited_by' => $owner->id,
        'email' => $owner->email,
        'role' => 'admin',
        'token_hash' => hash('sha256', 'tok'),
        'expires_at' => now()->addDays(7),
    ]);
    $response = post("/api/v1/invitations/{$invitation->token_hash}/accept", [], ['Authorization' => 'Bearer '.$owner->createToken('t')->plainTextToken]);
    $response->assertStatus(200);
    $this->assertTrue($workspace->fresh()->members->contains('id', $owner->id));
});

it('rejects an expired invitation accept', function () {
    $user = $this->createUser(['role' => 'member']);
    $workspace = $this->createWorkspace(['owner' => $user]);
    $invitation = Invitation::create([
        'workspace_id' => $workspace->id,
        'invited_by' => $user->id,
        'email' => $user->email,
        'role' => 'member',
        'token_hash' => hash('sha256', 'tok'),
        'expires_at' => now()->subDays(1),
    ]);
    $response = post("/api/v1/invitations/{$invitation->token_hash}/accept", [], ['Authorization' => 'Bearer '.$user->createToken('t')->plainTextToken]);
    $response->assertStatus(422);
});
