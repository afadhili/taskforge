<?php

use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AssistantController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\InvitationController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\SprintController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')
        ->middleware('throttle:10,1')
        ->group(function (): void {
            Route::post('register', [AuthController::class, 'register']);
            Route::post('login', [AuthController::class, 'login']);
            Route::get('oauth/{provider}', [
                AuthController::class,
                'oauthRedirect',
            ])->whereIn('provider', ['google', 'github']);
            Route::post('oauth/{provider}/callback', [
                AuthController::class,
                'oauthCallback',
            ])->whereIn('provider', ['google', 'github']);
        });
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::prefix('auth')->group(function (): void {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::patch('profile', [AuthController::class, 'updateProfile']);
            Route::post('profile/avatar', [
                AuthController::class,
                'updateAvatar',
            ]);
            Route::delete('profile/avatar', [
                AuthController::class,
                'deleteAvatar',
            ]);
            Route::put('password', [AuthController::class, 'updatePassword']);
        });
        Route::put('auth/ai-key', [AssistantController::class, 'storeKey']);
        Route::delete('auth/ai-key', [AssistantController::class, 'deleteKey']);
        Route::get('auth/ai-key', [AssistantController::class, 'keyStatus']);
        Route::get('auth/ai-models', [AssistantController::class, 'models']);
        Route::get('auth/ai-usage', [
            AssistantController::class,
            'usageStatus',
        ]);
        Route::get('workspaces/{workspace}/assistant/threads', [
            AssistantController::class,
            'threads',
        ]);
        Route::get('workspaces/{workspace}/assistant/threads/{thread}', [
            AssistantController::class,
            'showThread',
        ]);
        Route::delete('workspaces/{workspace}/assistant/threads/{thread}', [
            AssistantController::class,
            'destroyThread',
        ]);
        Route::post('workspaces/{workspace}/assistant', [
            AssistantController::class,
            'ask',
        ])->middleware('throttle:40,1');
        Route::post('workspaces/{workspace}/invitations', [
            InvitationController::class,
            'store',
        ]);
        Route::post('invitations/{token}/accept', [
            InvitationController::class,
            'accept',
        ]);
        Route::apiResource('workspaces', WorkspaceController::class);
        Route::get('workspaces/{workspace}/members', [
            WorkspaceController::class,
            'members',
        ]);
        Route::post('workspaces/{workspace}/members', [
            WorkspaceController::class,
            'addMember',
        ]);
        Route::get('workspaces/{workspace}/labels', [
            WorkspaceController::class,
            'labels',
        ]);
        Route::post('workspaces/{workspace}/labels', [
            WorkspaceController::class,
            'createLabel',
        ]);
        Route::patch('workspaces/{workspace}/members/{member}', [
            WorkspaceController::class,
            'updateMember',
        ]);
        Route::delete('workspaces/{workspace}/members/{member}', [
            WorkspaceController::class,
            'removeMember',
        ]);
        Route::get('workspaces/{workspace}/projects', [
            ProjectController::class,
            'index',
        ]);
        Route::post('workspaces/{workspace}/projects', [
            ProjectController::class,
            'store',
        ]);
        Route::apiResource('projects', ProjectController::class)->except([
            'index',
            'store',
        ]);
        Route::get('projects/{project}/tasks', [
            TaskController::class,
            'index',
        ]);
        Route::post('projects/{project}/tasks', [
            TaskController::class,
            'store',
        ]);
        Route::get('projects/{project}/sprints', [
            SprintController::class,
            'index',
        ]);
        Route::post('projects/{project}/sprints', [
            SprintController::class,
            'store',
        ]);
        Route::get('projects/{project}/analytics', [
            AnalyticsController::class,
            'project',
        ]);
        Route::apiResource('sprints', SprintController::class)->only([
            'show',
            'update',
            'destroy',
        ]);
        Route::apiResource('tasks', TaskController::class)->except([
            'index',
            'store',
        ]);
        Route::put('tasks/{task}/dependencies', [
            TaskController::class,
            'dependencies',
        ]);
        Route::post('tasks/{task}/comments', [
            TaskController::class,
            'comments',
        ]);
        Route::get('tasks/{task}/activity', [
            TaskController::class,
            'activity',
        ]);
        Route::post('tasks/{task}/attachments', [
            AttachmentController::class,
            'store',
        ]);
        Route::get('attachments/{attachment}', [
            AttachmentController::class,
            'download',
        ]);
        Route::delete('attachments/{attachment}', [
            AttachmentController::class,
            'destroy',
        ]);
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::patch('notifications/read-all', [
            NotificationController::class,
            'readAll',
        ]);
        Route::patch('notifications/{notification}/read', [
            NotificationController::class,
            'read',
        ]);
    });
});
