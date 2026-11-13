<?php

use App\Models\Project;
use App\Models\User;
use App\Services\WorkspaceService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('rejects a dependency update that would create a cycle', function (): void {
    $owner = User::factory()->create();
    $workspace = app(WorkspaceService::class)->create($owner, 'Task Graph');
    $project = Project::create(['workspace_id' => $workspace->id, 'name' => 'Graph', 'key' => 'GRAPH']);
    $token = $owner->createToken('test')->plainTextToken;

    $first = $this->withToken($token)->postJson("/api/v1/projects/{$project->id}/tasks", ['title' => 'First task'])->assertCreated()->json('data.id');
    $second = $this->withToken($token)->postJson("/api/v1/projects/{$project->id}/tasks", ['title' => 'Second task'])->assertCreated()->json('data.id');
    $this->withToken($token)->putJson("/api/v1/tasks/{$first}/dependencies", ['dependency_ids' => [$second]])->assertOk();
    $response = $this->withToken($token)->putJson("/api/v1/tasks/{$second}/dependencies", ['dependency_ids' => [$first]]);

    $response->assertUnprocessable()->assertJsonValidationErrors('dependencies');
    $this->assertDatabaseHas('task_dependencies', ['task_id' => $first, 'depends_on_task_id' => $second]);
    $this->assertDatabaseMissing('task_dependencies', ['task_id' => $second, 'depends_on_task_id' => $first]);
});

it('returns 403 when a viewer tries to create a task', function (): void {
    $owner = User::factory()->create();
    $viewer = User::factory()->create();
    $workspace = app(WorkspaceService::class)->create($owner, 'Read Only');
    $workspace->members()->attach($viewer->id, ['role' => 'viewer']);
    $project = Project::create(['workspace_id' => $workspace->id, 'name' => 'Plan', 'key' => 'PLAN']);

    $this->actingAs($viewer, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks", ['title' => 'Should be blocked'])->assertForbidden();

    $this->assertDatabaseMissing('tasks', ['project_id' => $project->id, 'title' => 'Should be blocked']);
});

it('returns 404 when a user requests a project outside their workspace', function (): void {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $workspace = app(WorkspaceService::class)->create($owner, 'Private Space');
    $project = Project::create(['workspace_id' => $workspace->id, 'name' => 'Private', 'key' => 'PRIV']);

    $this->actingAs($stranger, 'sanctum')->getJson("/api/v1/projects/{$project->id}")->assertNotFound();
});
