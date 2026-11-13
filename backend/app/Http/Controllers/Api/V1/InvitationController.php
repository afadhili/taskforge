<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InvitationController extends Controller
{
    public function store(Request $request, Workspace $workspace, NotificationService $notifications): JsonResponse
    {
        $this->authorize('update', $workspace);
        $data = $request->validate(['email' => ['required', 'email', 'max:255'], 'role' => ['sometimes', 'in:admin,member,viewer']]);
        $plainToken = Str::random(48);
        $invitation = $workspace->invitations()->create(['invited_by' => $request->user()->id, 'email' => strtolower($data['email']), 'role' => $data['role'] ?? 'member', 'token_hash' => hash('sha256', $plainToken), 'expires_at' => now()->addDays(7)]);
        if ($invitee = User::where('email', $invitation->email)->first()) {
            $notifications->create($invitee, 'workspace_invitation', ['invitation_id' => $invitation->id, 'workspace' => $workspace->name]);
        }

        return response()->json(['data' => ['id' => $invitation->id, 'email' => $invitation->email, 'role' => $invitation->role, 'expires_at' => $invitation->expires_at, 'accept_token' => $plainToken]], 201);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        // The UI receives the one-time plaintext token; accepting its stored hash
        // as well keeps links safe when a client persists only the digest.
        $invitation = Invitation::pending()->whereIn('token_hash', [$token, hash('sha256', $token)])->firstOrFail();
        if ($invitation->expires_at->isPast()) {
            throw ValidationException::withMessages(['invitation' => ['This invitation has expired.']]);
        }
        if (strcasecmp($request->user()->email, $invitation->email) !== 0) {
            abort(403, 'This invitation was sent to a different email address.');
        }
        DB::transaction(function () use ($invitation, $request): void {
            $invitation->workspace->members()->syncWithoutDetaching([$request->user()->id => ['role' => $invitation->role]]);
            $invitation->update(['accepted_at' => now()]);
        });

        return response()->json(['message' => 'Invitation accepted.', 'data' => ['workspace_id' => $invitation->workspace_id, 'role' => $invitation->role]]);
    }
}
