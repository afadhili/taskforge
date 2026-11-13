<?php

use App\Models\AssistantThread;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskLabel;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(LazilyRefreshDatabase::class);

it(
    'saves a user AI key encrypted and never returns its value',
    function (): void {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->putJson('/api/v1/auth/ai-key', [
            'api_key' => 'sk-user-secret',
        ]);
        $response
            ->assertOk()
            ->assertJsonPath('data.has_custom_key', true)
            ->assertDontSee('sk-user-secret');
        expect(
            DB::table('users')->where('id', $user->id)->value('ai_api_key'),
        )->not->toBe('sk-user-secret');
        $this->actingAs($user)
            ->getJson('/api/v1/auth/ai-key')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'has_custom_key' => true,
                    'custom_base_url' => null,
                    'model' => config('services.assistant.model'),
                ],
            ]);
    },
);

it(
    'saves a custom AI provider URL without requiring an API key',
    function (): void {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/auth/ai-key', [
                'base_url' => 'https://ai.example/v1',
            ])
            ->assertOk()
            ->assertJsonPath('data.has_custom_key', false)
            ->assertJsonPath('data.custom_base_url', 'https://ai.example/v1');

        $this->actingAs($user)
            ->getJson('/api/v1/auth/ai-key')
            ->assertOk()
            ->assertJsonPath('data.has_custom_key', false)
            ->assertJsonPath('data.custom_base_url', 'https://ai.example/v1');
    },
);

it(
    "fetches available models from a custom provider and saves the user's selection",
    function (): void {
        config(['services.assistant.api_key' => 'sk-global']);
        $user = User::factory()->create([
            'ai_base_url' => 'https://custom-ai.example/v1',
        ]);
        Http::fake([
            'https://custom-ai.example/v1/models' => Http::response([
                'data' => [
                    ['id' => 'model-alpha', 'name' => 'Model Alpha'],
                    ['id' => 'model-beta'],
                ],
            ]),
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/auth/ai-models')
            ->assertOk()
            ->assertJsonPath('data.models.0.id', 'model-alpha')
            ->assertJsonPath('data.models.0.name', 'Model Alpha')
            ->assertJsonPath('data.models.1.id', 'model-beta');

        Http::assertSent(
            fn ($request): bool => $request->url() ===
                'https://custom-ai.example/v1/models' &&
                ! $request->hasHeader('Authorization'),
        );

        $this->actingAs($user)
            ->putJson('/api/v1/auth/ai-key', ['model' => 'model-beta'])
            ->assertOk()
            ->assertJsonPath('data.model', 'model-beta');
    },
);

it(
    'does not forward the global API key to a custom AI provider URL',
    function (): void {
        config([
            'services.assistant.api_key' => 'sk-global',
            'services.assistant.model' => 'test-model',
        ]);
        $user = User::factory()->create([
            'ai_base_url' => 'https://custom-ai.example/v1',
            'ai_model' => 'custom-model',
        ]);
        $workspace = Workspace::create([
            'name' => 'Private Space',
            'slug' => 'private-space',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        Http::fake([
            'https://custom-ai.example/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => 'Hello.']]],
            ]),
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'Hello',
            ])
            ->assertOk()
            ->assertJsonPath('data.answer', 'Hello.');

        Http::assertSent(
            fn ($request): bool => $request->url() ===
                'https://custom-ai.example/v1/chat/completions' &&
                ! $request->hasHeader('Authorization'),
        );
    },
);

it(
    'uses the user key and enforces the daily assistant cap with workspace scoped context',
    function (): void {
        config([
            'services.assistant.api_key' => 'sk-global',
            'services.assistant.base_url' => 'https://ai.example/v1',
            'services.assistant.model' => 'test-model',
        ]);
        $user = User::factory()->create([
            'ai_api_key' => 'sk-user',
            'ai_model' => 'user-model',
        ]);
        $workspace = Workspace::create([
            'name' => 'Private Space',
            'slug' => 'private-space',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        Http::fake([
            'https://ai.example/v1/chat/completions' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'There are no projects yet.']],
                ],
            ]),
        ]);
        $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'Summarize my space',
            ])
            ->assertOk()
            ->assertJsonPath('data.requests_remaining', 29);
        $this->actingAs($user)
            ->getJson('/api/v1/auth/ai-usage')
            ->assertOk()
            ->assertJsonPath('data.requests_used', 1)
            ->assertJsonPath('data.requests_remaining', 29);
        Http::assertSent(
            fn ($request): bool => $request->hasHeader(
                'Authorization',
                'Bearer sk-user',
            ) &&
                str_contains(
                    $request['messages'][0]['content'],
                    'Private Space',
                ) &&
                $request['model'] === 'test-model',
        );
        DB::table('ai_assistant_usage')->update(['requests' => 30]);
        $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'Another question',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('limit');
    },
);

it(
    'sends full workspace project and individual task details to the assistant',
    function (): void {
        config([
            'services.assistant.api_key' => 'sk-global',
            'services.assistant.base_url' => 'https://ai.example/v1',
            'services.assistant.model' => 'test-model',
        ]);
        $user = User::factory()->create([
            'name' => 'Workspace Owner',
            'email' => 'owner@example.test',
        ]);
        $workspace = Workspace::create([
            'name' => 'Detailed Workspace',
            'slug' => 'detailed-workspace',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        $project = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Platform',
            'key' => 'PLAT',
            'description' => 'Platform launch work',
            'status' => 'active',
            'start_date' => '2026-11-11',
            'due_date' => '2026-12-11',
        ]);
        $firstTask = Task::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            'title' => 'Implement request tracing',
            'description' => 'Add request IDs to API logs.',
            'status' => 'in_progress',
            'priority' => 'high',
            'estimate_minutes' => 90,
        ]);
        $secondTask = Task::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            'title' => 'Document tracing rollout',
            'description' => 'Write the deployment and rollback steps.',
            'status' => 'todo',
            'priority' => 'medium',
            'estimate_minutes' => 30,
        ]);
        $secondTask->dependencies()->attach($firstTask->id);
        $firstTask->comments()->create([
            'user_id' => $user->id,
            'body' => 'Coordinate rollout with the API team.',
        ]);
        $label = TaskLabel::create([
            'workspace_id' => $workspace->id,
            'name' => 'Observability',
            'color' => '#123456',
        ]);
        $firstTask->labels()->attach($label->id);

        $otherWorkspace = Workspace::create([
            'name' => 'Other Workspace',
            'slug' => 'other-workspace',
            'owner_id' => $user->id,
        ]);
        $otherProject = Project::create([
            'workspace_id' => $otherWorkspace->id,
            'name' => 'Private Project',
            'key' => 'PRIV',
        ]);
        Task::create([
            'project_id' => $otherProject->id,
            'created_by' => $user->id,
            'title' => 'SECRET OTHER WORKSPACE TASK',
        ]);

        Http::fake([
            'https://ai.example/v1/chat/completions' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Workspace details loaded.']],
                ],
            ]),
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'Summarize the workspace tasks.',
            ])
            ->assertOk();

        Http::assertSent(function ($request): bool {
            $systemPrompt = $request['messages'][0]['content'];
            $userMessage = $request['messages'][1]['content'];

            return str_contains($systemPrompt, 'Platform launch work') &&
                str_contains($systemPrompt, 'owner@example.test') &&
                str_contains($systemPrompt, '"workspace_role":"owner"') &&
                str_contains($userMessage, 'Message sender:') &&
                str_contains($userMessage, 'Workspace Owner') &&
                str_contains($userMessage, 'owner@example.test') &&
                str_contains($systemPrompt, '2026-11-11') &&
                str_contains($systemPrompt, 'Implement request tracing') &&
                str_contains($systemPrompt, 'Document tracing rollout') &&
                str_contains(
                    $systemPrompt,
                    'Coordinate rollout with the API team.',
                ) &&
                str_contains($systemPrompt, 'Observability') &&
                str_contains($systemPrompt, 'SECRET OTHER WORKSPACE TASK') ===
                    false;
        });
    },
);

it(
    'streams assistant response chunks and stores the completed exchange',
    function (): void {
        config([
            'services.assistant.api_key' => 'sk-global',
            'services.assistant.base_url' => 'https://ai.example/v1',
            'services.assistant.model' => 'test-model',
        ]);
        $user = User::factory()->create();
        $workspace = Workspace::create([
            'name' => 'Streaming Space',
            'slug' => 'streaming-space',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        $providerStream =
            collect(['Hello ', 'from the assistant.'])
                ->map(
                    fn (string $text): string => 'data: '.
                        json_encode([
                            'choices' => [['delta' => ['content' => $text]]],
                        ]),
                )
                ->push('data: [DONE]')
                ->implode("\n\n")."\n\n";
        Http::fake([
            'https://ai.example/v1/chat/completions' => Http::response(
                $providerStream,
                200,
                ['Content-Type' => 'text/event-stream'],
            ),
        ]);

        $response = $this->actingAs($user)->postJson(
            "/api/v1/workspaces/{$workspace->id}/assistant",
            ['question' => 'Say hello', 'stream' => true],
        );
        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'text/event-stream; charset=utf-8');
        $content = $response->streamedContent();
        expect($content)
            ->toContain('"text":"Hello "')
            ->toContain('"text":"from the assistant."')
            ->toContain('"type":"done"');
        expect(
            AssistantThread::query()
                ->where('workspace_id', $workspace->id)
                ->count(),
        )->toBe(1);
        expect(
            AssistantThread::query()
                ->where('workspace_id', $workspace->id)
                ->firstOrFail()
                ->messages()
                ->pluck('content')
                ->all(),
        )->toBe(['Say hello', 'Hello from the assistant.']);
        Http::assertSent(fn ($request): bool => $request['stream'] === true);
    },
);

it(
    'does not charge the daily assistant allowance when the provider fails',
    function (): void {
        config([
            'services.assistant.api_key' => 'sk-global',
            'services.assistant.base_url' => 'https://ai.example/v1',
            'services.assistant.model' => 'test-model',
        ]);
        $user = User::factory()->create();
        $workspace = Workspace::create([
            'name' => 'Private Space',
            'slug' => 'private-space',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        Http::fake([
            'https://ai.example/v1/chat/completions' => Http::response(
                ['error' => ['message' => 'provider unavailable']],
                503,
            ),
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'Summarize my space',
            ])
            ->assertStatus(502)
            ->assertJsonPath('data.requests_remaining', 30);

        $this->actingAs($user)
            ->getJson('/api/v1/auth/ai-usage')
            ->assertOk()
            ->assertJsonPath('data.requests_used', 0)
            ->assertJsonPath('data.requests_remaining', 30);
    },
);

it(
    'returns a JSON error and restores quota when the AI provider connection fails',
    function (): void {
        config([
            'services.assistant.api_key' => 'sk-global',
            'services.assistant.base_url' => 'https://ai.example/v1',
            'services.assistant.model' => 'test-model',
        ]);
        $user = User::factory()->create();
        $workspace = Workspace::create([
            'name' => 'Private Space',
            'slug' => 'private-space',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        Http::fake(function (): never {
            throw new ConnectionException('Connection timed out.');
        });

        $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'Summarize my space',
            ])
            ->assertStatus(502)
            ->assertJsonPath('message', 'AI provider is unavailable.')
            ->assertJsonPath('data.requests_remaining', 30);

        $this->actingAs($user)
            ->getJson('/api/v1/auth/ai-usage')
            ->assertOk()
            ->assertJsonPath('data.requests_used', 0)
            ->assertJsonPath('data.requests_remaining', 30);
    },
);

it(
    'persists assistant exchanges in workspace-scoped user threads',
    function (): void {
        config([
            'services.assistant.api_key' => 'sk-global',
            'services.assistant.base_url' => 'https://ai.example/v1',
            'services.assistant.model' => 'test-model',
        ]);
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $workspace = Workspace::create([
            'name' => 'Chat Space',
            'slug' => 'chat-space',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        $workspace->members()->attach($otherUser->id, ['role' => 'member']);
        Http::fake([
            'https://ai.example/v1/chat/completions' => Http::sequence()
                ->push([
                    'choices' => [['message' => ['content' => 'First answer']]],
                ])
                ->push([
                    'choices' => [
                        ['message' => ['content' => 'Second answer']],
                    ],
                ]),
        ]);

        $firstReply = $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'What shipped this week?',
            ])
            ->assertOk()
            ->assertJsonPath('data.answer', 'First answer');
        $threadId = $firstReply->json('data.thread_id');

        $this->actingAs($user)
            ->getJson("/api/v1/workspaces/{$workspace->id}/assistant/threads")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'What shipped this week?');

        $this->actingAs($user)
            ->getJson(
                "/api/v1/workspaces/{$workspace->id}/assistant/threads/{$threadId}",
            )
            ->assertOk()
            ->assertJsonCount(2, 'data.messages')
            ->assertJsonPath('data.messages.0.role', 'user')
            ->assertJsonPath('data.messages.1.content', 'First answer');

        $this->actingAs($user)
            ->postJson("/api/v1/workspaces/{$workspace->id}/assistant", [
                'question' => 'And what is next?',
                'thread_id' => $threadId,
            ])
            ->assertOk()
            ->assertJsonPath('data.thread_id', $threadId);

        $this->actingAs($user)
            ->getJson(
                "/api/v1/workspaces/{$workspace->id}/assistant/threads/{$threadId}",
            )
            ->assertOk()
            ->assertJsonCount(4, 'data.messages');

        $this->actingAs($otherUser)
            ->getJson(
                "/api/v1/workspaces/{$workspace->id}/assistant/threads/{$threadId}",
            )
            ->assertNotFound();
    },
);

it(
    'deletes only the signed-in user’s assistant threads in the requested workspace',
    function (): void {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $workspace = Workspace::create([
            'name' => 'Chat Deletion',
            'slug' => 'chat-deletion',
            'owner_id' => $user->id,
        ]);
        $workspace->members()->attach($user->id, ['role' => 'owner']);
        $workspace->members()->attach($otherUser->id, ['role' => 'member']);
        $thread = AssistantThread::create([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'title' => 'My chat',
        ]);
        $thread
            ->messages()
            ->create(['role' => 'user', 'content' => 'Question']);
        $otherThread = AssistantThread::create([
            'user_id' => $otherUser->id,
            'workspace_id' => $workspace->id,
            'title' => 'Their chat',
        ]);

        $this->actingAs($user)
            ->deleteJson(
                "/api/v1/workspaces/{$workspace->id}/assistant/threads/{$thread->id}",
            )
            ->assertOk()
            ->assertJsonPath('message', 'Chat deleted.');

        $this->assertDatabaseMissing('assistant_threads', [
            'id' => $thread->id,
        ]);
        $this->assertDatabaseMissing('assistant_messages', [
            'assistant_thread_id' => $thread->id,
        ]);
        $this->actingAs($user)
            ->deleteJson(
                "/api/v1/workspaces/{$workspace->id}/assistant/threads/{$otherThread->id}",
            )
            ->assertNotFound();
        $this->assertDatabaseHas('assistant_threads', [
            'id' => $otherThread->id,
        ]);
    },
);

it(
    'starts OAuth with a one time state and exchanges a verified Google identity for a token',
    function (): void {
        config([
            'services.oauth.google' => [
                'client_id' => 'google-client',
                'client_secret' => 'google-secret',
                'redirect' => 'https://taskforge.test/api/v1/auth/oauth/google/callback',
            ],
        ]);
        $start = $this->getJson('/api/v1/auth/oauth/google')->assertOk();
        $state = $start->json('data.state');
        expect($start->json('data.authorization_url'))
            ->toContain('accounts.google.com')
            ->toContain($state);
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'provider-access-token',
            ]),
            'https://www.googleapis.com/oauth2/v3/userinfo' => Http::response([
                'sub' => 'google-123',
                'email' => 'google@example.test',
                'email_verified' => true,
                'name' => 'Google User',
                'picture' => 'https://lh3.googleusercontent.com/google-avatar.png',
            ]),
        ]);
        $this->postJson('/api/v1/auth/oauth/google/callback', [
            'code' => 'oauth-code',
            'state' => $state,
        ])
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['user' => ['id', 'email'], 'token'],
            ])
            ->assertJsonPath('data.user.email', 'google@example.test')
            ->assertJsonPath(
                'data.user.avatar_url',
                'https://lh3.googleusercontent.com/google-avatar.png',
            )
            ->assertJsonPath('data.user.has_custom_avatar', false);
        $this->postJson('/api/v1/auth/oauth/google/callback', [
            'code' => 'oauth-code',
            'state' => $state,
        ])->assertBadRequest();
    },
);

it(
    'requests a JSON token response when exchanging a GitHub OAuth code',
    function (): void {
        config([
            'services.oauth.github' => [
                'client_id' => 'github-client',
                'client_secret' => 'github-secret',
                'redirect' => 'http://localhost:5174/oauth/github/callback',
            ],
        ]);
        $state = $this->getJson('/api/v1/auth/oauth/github')
            ->assertOk()
            ->json('data.state');
        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response([
                'access_token' => 'github-access-token',
            ]),
            'https://api.github.com/user' => Http::response([
                'id' => 123,
                'login' => 'github-user',
                'name' => 'GitHub User',
                'avatar_url' => 'https://avatars.githubusercontent.com/u/123?v=4',
            ]),
            'https://api.github.com/user/emails' => Http::response([
                [
                    'email' => 'github@example.test',
                    'primary' => true,
                    'verified' => true,
                ],
            ]),
        ]);

        $this->postJson('/api/v1/auth/oauth/github/callback', [
            'code' => 'oauth-code',
            'state' => $state,
        ])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'github@example.test')
            ->assertJsonPath(
                'data.user.avatar_url',
                'https://avatars.githubusercontent.com/u/123?v=4',
            );

        Http::assertSent(
            fn ($request): bool => $request->url() ===
                'https://github.com/login/oauth/access_token' &&
                $request->hasHeader('Accept', 'application/json'),
        );
    },
);
