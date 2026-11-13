<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(protected NotificationService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->service->index($request->user()));
    }

    public function read(Request $request, string $notification): JsonResponse
    {
        $this->service->markAsRead($request->user(), $notification);

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function readAll(Request $request): JsonResponse
    {
        $this->service->markAllAsRead($request->user());

        return response()->json(['message' => 'Notifications marked as read.']);
    }
}
