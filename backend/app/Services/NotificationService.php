<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

class NotificationService
{
    public function index(User $user, int $perPage = 20): array
    {
        $notifications = $user->notifications()->latest()->paginate(min($perPage, 100));

        return [
            'data' => $notifications,
            'unread_count' => $user->unreadNotifications()->count(),
        ];
    }

    public function markAsRead(User $user, string $notification): void
    {
        $item = $user->notifications()->whereKey($notification)->firstOrFail();

        $item->markAsRead();
    }

    public function markAllAsRead(User $user): void
    {
        $user->unreadNotifications()->update(['read_at' => now()]);
    }

    public function create(User $user, string $type, array $data = []): DatabaseNotification
    {
        return $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => $type,
            'data' => $data,
        ]);
    }
}
