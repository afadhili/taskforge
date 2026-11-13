<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\WorkspaceService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(LazilyRefreshDatabase::class);

it(
    'returns a consistent JSON envelope for the notifications endpoints',
    function (): void {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonStructure(['data', 'unread_count']);

        $this->withToken($token)
            ->patchJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('message', 'Notifications marked as read.');

        $notification = $user->notifications()->create([
            'id' => '550e8400-e29b-41d4-a716-446655440000',
            'type' => 'test',
            'data' => [],
        ]);

        $this->withToken($token)
            ->patchJson("/api/v1/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('message', 'Notification marked as read.');

        $this->assertTrue(
            $user
                ->unreadNotifications()
                ->where('id', $notification->id)
                ->doesntExist(),
        );
    },
);

it('computes analytics for a project', function (): void {
    $owner = User::factory()->create();
    $workspace = app(WorkspaceService::class)->create($owner, 'Analytics');
    $project = Project::create([
        'workspace_id' => $workspace->id,
        'name' => 'Analytics',
        'key' => 'ANAL',
    ]);

    $token = $owner->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->getJson("/api/v1/projects/{$project->id}/analytics")
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'completion_rate',
                'total_tasks',
                'completed_tasks',
                'overdue_tasks',
                'status_breakdown',
                'workload',
                'sprint_velocity',
                'health',
            ],
        ])
        ->assertJsonPath('data.completion_rate', 0)
        ->assertJsonPath('data.health', 'on_track');
});

it(
    'manages sprint create with tasks, task add/remove and delete',
    function (): void {
        $owner = User::factory()->create();
        $workspace = app(WorkspaceService::class)->create($owner, 'Sprints');
        $project = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Sprints',
            'key' => 'SPR',
        ]);
        $task = $this->withToken(
            $token = $owner->createToken('test')->plainTextToken,
        )
            ->postJson("/api/v1/projects/{$project->id}/tasks", [
                'title' => 'Task',
            ])
            ->assertCreated()
            ->json('data');

        $sprintId = $this->withToken($token)
            ->postJson("/api/v1/projects/{$project->id}/sprints", [
                'name' => 'Sprint 1',
                'starts_at' => now()->toDateString(),
                'ends_at' => now()->addDays(5)->toDateString(),
                'task_ids' => [$task['id']],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Sprint 1')
            ->json('data.id');

        $this->assertCount(
            1,
            $this->withToken($token)
                ->getJson("/api/v1/sprints/{$sprintId}")
                ->json('data.tasks'),
        );

        $this->withToken($token)
            ->patchJson("/api/v1/sprints/{$sprintId}", [
                'name' => 'Sprint 1 renamed',
                'task_ids' => [],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Sprint 1 renamed');

        $this->withToken($token)
            ->delete("/api/v1/sprints/{$sprintId}")
            ->assertNoContent();
    },
);

it('manages workspace labels and members', function (): void {
    $owner = User::factory()->create([
        'oauth_provider' => 'github',
        'oauth_avatar_url' => 'https://avatars.githubusercontent.com/u/99?v=4',
    ]);
    $workspace = app(WorkspaceService::class)->create($owner, 'Workspace');
    $token = $owner->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->getJson("/api/v1/workspaces/{$workspace->id}/members")
        ->assertOk()
        ->assertJsonPath(
            'data.0.avatar_url',
            'https://avatars.githubusercontent.com/u/99?v=4',
        );

    $this->withToken($token)
        ->getJson("/api/v1/workspaces/{$workspace->id}/labels")
        ->assertOk()
        ->assertJsonStructure(['data' => []]);

    $this->withToken($token)
        ->postJson("/api/v1/workspaces/{$workspace->id}/labels", [
            'name' => 'Urgent',
            'color' => '#ff0000',
        ])
        ->assertCreated()
        ->assertJsonPath('data.color', '#ff0000');

    $this->withToken($token)
        ->postJson("/api/v1/workspaces/{$workspace->id}/members", [
            'email' => $owner->email,
            'role' => 'admin',
        ])
        ->assertStatus(409)
        ->assertJsonPath('message', 'User is already a workspace member.');

    $this->withToken($token)
        ->postJson("/api/v1/workspaces/{$workspace->id}/members", [
            'email' => 'nobody@example.com',
            'role' => 'admin',
        ])
        ->assertStatus(422);
});

it('logs activity with the acting user name on comments', function (): void {
    $owner = User::factory()->create();
    $workspace = app(WorkspaceService::class)->create($owner, 'Activity');
    $project = Project::create([
        'workspace_id' => $workspace->id,
        'name' => 'Activity',
        'key' => 'ACT',
    ]);
    $task = $this->withToken(
        $token = $owner->createToken('test')->plainTextToken,
    )
        ->postJson("/api/v1/projects/{$project->id}/tasks", ['title' => 'Task'])
        ->assertCreated()
        ->json('data');

    $actor = User::factory()->create();
    $workspace->members()->attach($actor->id, ['role' => 'member']);
    $token = $actor->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->postJson("/api/v1/tasks/{$task['id']}/comments", ['body' => 'Hello'])
        ->assertCreated()
        ->assertJsonPath('data.body', 'Hello');

    $this->withToken($token)
        ->getJson("/api/v1/tasks/{$task['id']}/activity")
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'action', 'user' => ['id', 'name']],
            ],
        ])
        ->assertJsonPath('data.0.user.name', $actor->name);
});

it('uploads, downloads and deletes an attachment', function (): void {
    $owner = User::factory()->create();
    $workspace = app(WorkspaceService::class)->create($owner, 'Attachments');
    $project = Project::create([
        'workspace_id' => $workspace->id,
        'name' => 'Attachments',
        'key' => 'ATT',
    ]);
    $taskResponse = $this->withToken(
        $token = $owner->createToken('test')->plainTextToken,
    )
        ->postJson("/api/v1/projects/{$project->id}/tasks", ['title' => 'Task'])
        ->assertCreated();
    $task = $taskResponse->json('data');

    $file = UploadedFile::fake()->createWithContent(
        'document.txt',
        'hello world',
    );

    $this->withToken($token)
        ->post("/api/v1/tasks/{$task['id']}/attachments", ['file' => $file])
        ->assertCreated()
        ->assertJsonPath('data.original_name', 'document.txt');

    $attachment = Task::find($task['id'])->attachments->first();

    $this->withToken($token)
        ->get("/api/v1/attachments/{$attachment->id}")
        ->assertOk()
        ->assertDownload($attachment->original_name);

    $this->withToken($token)
        ->delete("/api/v1/attachments/{$attachment->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('attachments', ['id' => $attachment->id]);
});
