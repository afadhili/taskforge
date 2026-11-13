<?php

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('creates an account and returns a usable bearer token', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Ari Tester',
        'email' => 'ari@example.test',
        'password' => 'a-secure-password',
        'password_confirmation' => 'a-secure-password',
    ]);

    $response->assertCreated()->assertJsonStructure([
        'data' => ['user' => ['id', 'name', 'email'], 'token'],
    ]);
    $user = User::where('email', 'ari@example.test')->firstOrFail();
    $this->assertModelExists($user);
    expect(Hash::check('a-secure-password', $user->password))->toBeTrue();
});

it(
    'uploads and removes the authenticated user profile picture',
    function (): void {
        Storage::fake('public');
        $user = User::factory()->create([
            'oauth_provider' => 'google',
            'oauth_avatar_url' => 'https://lh3.googleusercontent.com/default.png',
        ]);
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/SscAAAAASUVORK5CYII=',
        );

        $uploaded = $this->actingAs($user)
            ->postJson('/api/v1/auth/profile/avatar', [
                'avatar' => UploadedFile::fake()->createWithContent(
                    'profile.png',
                    $png,
                ),
            ])
            ->assertOk()
            ->assertJsonPath('data.oauth_provider', 'google')
            ->assertJsonPath('data.has_custom_avatar', true)
            ->json('data.avatar_url');

        $path = $user->refresh()->avatar_path;
        expect($path)->not->toBeNull();
        Storage::disk('public')->assertExists($path);
        expect($uploaded)->toBe(Storage::disk('public')->url($path));

        $this->actingAs($user)
            ->deleteJson('/api/v1/auth/profile/avatar')
            ->assertOk()
            ->assertJsonPath(
                'data.avatar_url',
                'https://lh3.googleusercontent.com/default.png',
            )
            ->assertJsonPath('data.has_custom_avatar', false);

        Storage::disk('public')->assertMissing($path);
    },
);

it(
    'returns 401 when the profile is requested without a token',
    function (): void {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    },
);
