<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function oauthRedirect(string $provider): JsonResponse
    {
        $configuration = config("services.oauth.{$provider}");
        abort_unless(
            $configuration['client_id'] && $configuration['redirect'],
            503,
            'OAuth provider is not configured.',
        );
        $state = Str::random(48);
        Cache::put('oauth:'.$state, $provider, now()->addMinutes(10));
        $query = http_build_query([
            'client_id' => $configuration['client_id'],
            'redirect_uri' => $configuration['redirect'],
            'response_type' => 'code',
            'scope' => $provider === 'google'
                    ? 'openid email profile'
                    : 'read:user user:email',
            'state' => $state,
        ]);
        $url =
            ($provider === 'google'
                ? 'https://accounts.google.com/o/oauth2/v2/auth?'
                : 'https://github.com/login/oauth/authorize?').$query;

        return response()->json([
            'data' => ['authorization_url' => $url, 'state' => $state],
        ]);
    }

    public function oauthCallback(
        Request $request,
        string $provider,
    ): JsonResponse {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'state' => ['required', 'string'],
        ]);
        abort_unless(
            Cache::pull('oauth:'.$data['state']) === $provider,
            400,
            'Invalid or expired OAuth state.',
        );
        $configuration = config("services.oauth.{$provider}");
        abort_unless(
            $configuration['client_id'] &&
                $configuration['client_secret'] &&
                $configuration['redirect'],
            503,
            'OAuth provider is not configured.',
        );
        $tokenResponse = Http::asForm()
            ->acceptJson()
            ->post(
                $provider === 'google'
                    ? 'https://oauth2.googleapis.com/token'
                    : 'https://github.com/login/oauth/access_token',
                [
                    'client_id' => $configuration['client_id'],
                    'client_secret' => $configuration['client_secret'],
                    'redirect_uri' => $configuration['redirect'],
                    'code' => $data['code'],
                    'grant_type' => 'authorization_code',
                ],
            );
        abort_unless(
            $tokenResponse->successful() &&
                $tokenResponse->json('access_token'),
            401,
            'OAuth authorization failed.',
        );
        $accessToken = $tokenResponse->json('access_token');
        $identityResponse = Http::withToken($accessToken)
            ->acceptJson()
            ->get(
                $provider === 'google'
                    ? 'https://www.googleapis.com/oauth2/v3/userinfo'
                    : 'https://api.github.com/user',
            );
        abort_unless(
            $identityResponse->successful(),
            401,
            'Could not read OAuth account.',
        );
        $identity = $identityResponse->json();
        if ($provider === 'github') {
            $emailsResponse = Http::withToken($accessToken)
                ->acceptJson()
                ->get('https://api.github.com/user/emails');
            $verifiedEmail = collect($emailsResponse->json())->first(
                fn (array $email): bool => ($email['primary'] ?? false) &&
                    ($email['verified'] ?? false),
            );
            $identity['email'] = $verifiedEmail['email'] ?? null;
            $identity['email_verified'] = (bool) $verifiedEmail;
        }
        abort_unless(
            isset($identity['email'], $identity['sub']) ||
                isset($identity['email'], $identity['id']),
            422,
            'OAuth account must provide an email address.',
        );
        abort_unless(
            $identity['email_verified'] ?? false,
            422,
            'OAuth account email must be verified.',
        );
        $providerId = (string) ($identity['sub'] ?? $identity['id']);
        $providerAvatarUrl =
            $identity['picture'] ?? ($identity['avatar_url'] ?? null);
        if (
            ! is_string($providerAvatarUrl) ||
            ! filter_var($providerAvatarUrl, FILTER_VALIDATE_URL) ||
            ! Str::startsWith(strtolower($providerAvatarUrl), 'https://')
        ) {
            $providerAvatarUrl = null;
        }

        $user = User::where('oauth_provider', $provider)
            ->where('oauth_provider_id', $providerId)
            ->first();
        if (! $user) {
            $user = User::where('email', $identity['email'])->first();
            if (
                $user &&
                $user->oauth_provider_id &&
                ($user->oauth_provider !== $provider ||
                    $user->oauth_provider_id !== $providerId)
            ) {
                abort(
                    409,
                    'This email is already linked to another sign-in provider.',
                );
            }
            $user ??= new User([
                'name' => $identity['name'] ??
                    ($identity['login'] ??
                        Str::before($identity['email'], '@')),
                'email' => $identity['email'],
                'password' => Str::random(64),
            ]);
        }

        $user->oauth_provider = $provider;
        $user->oauth_provider_id = $providerId;
        $user->email_verified_at ??= Carbon::now();
        if ($providerAvatarUrl) {
            $user->oauth_avatar_url = $providerAvatarUrl;
        }
        $user->save();

        $token = $user->createToken('taskforge-spa')->plainTextToken;

        return response()->json([
            'data' => ['user' => new UserResource($user), 'token' => $token],
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());
        $token = $user->createToken('taskforge-spa')->plainTextToken;

        return response()->json(
            ['data' => ['user' => new UserResource($user), 'token' => $token]],
            201,
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();
        if (
            ! $user ||
            ! Hash::check($request->validated('password'), $user->password)
        ) {
            return response()->json(
                ['message' => 'The provided credentials are incorrect.'],
                401,
            );
        }
        $token = $user->createToken('taskforge-spa')->plainTextToken;

        return response()->json([
            'data' => ['user' => new UserResource($user), 'token' => $token],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function updateProfile(Request $request): UserResource
    {
        $attributes = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                'unique:users,email,'.$request->user()->id,
            ],
        ]);
        $request->user()->update($attributes);

        return new UserResource($request->user()->refresh());
    }

    public function updateAvatar(Request $request): UserResource
    {
        $request->validate([
            'avatar' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $user = $request->user();
        $oldPath = $user->avatar_path;
        $newPath = $request
            ->file('avatar')
            ->storePublicly("avatars/{$user->id}", 'public');
        abort_unless($newPath, 500, 'Could not store profile picture.');

        $user->avatar_path = $newPath;
        $user->save();
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return new UserResource($user->refresh());
    }

    public function deleteAvatar(Request $request): UserResource
    {
        $user = $request->user();
        $oldPath = $user->avatar_path;
        $user->avatar_path = null;
        $user->save();
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return new UserResource($user->refresh());
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:10', 'confirmed'],
        ]);
        $request->user()->update(['password' => $data['password']]);
        $currentToken = $request->user()->currentAccessToken();
        $request
            ->user()
            ->tokens()
            ->where('id', '!=', $currentToken?->getKey())
            ->delete();
        $currentToken?->delete();

        return response()->json([
            'message' => 'Password updated.',
            'data' => [
                'token' => $request->user()->createToken('taskforge-spa')
                    ->plainTextToken,
            ],
        ]);
    }
}
