<?php

use App\Models\User;
use Tests\TestCase;

use function Pest\Laravel\put;

uses(TestCase::class)->in('Feature');

it('password rotate accepts correct current password', function () {
    $user = User::factory()->create(['password' => bcrypt('OldPass12345')]);
    $token = $user->createToken('t')->plainTextToken;

    $response = put('/api/v1/auth/password', [
        'current_password' => 'OldPass12345',
        'password' => 'NewPass12345',
        'password_confirmation' => 'NewPass12345',
    ], ['Authorization' => 'Bearer '.$token]);

    $response->assertStatus(200);
    $this->assertSame(1, $user->fresh()->tokens()->count());
});

it('password rotate rejects wrong current password', function () {
    $user = User::factory()->create(['password' => bcrypt('OldPass12345')]);
    $token = $user->createToken('t')->plainTextToken;

    $response = put('/api/v1/auth/password', [
        'current_password' => 'WrongPass12345',
        'password' => 'NewPass12345',
        'password_confirmation' => 'NewPass12345',
    ], ['Authorization' => 'Bearer '.$token]);

    $response->assertStatus(422);
    $this->assertTrue($user->fresh()->tokens()->count() > 0);
});
