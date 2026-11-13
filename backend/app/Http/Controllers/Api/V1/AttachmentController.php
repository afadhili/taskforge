<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttachmentStoreRequest;
use App\Models\Attachment;
use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function __construct(protected TaskService $service) {}

    public function store(AttachmentStoreRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $attachment = $this->service->addAttachment($task, $request->user(), $request->validated('file'));

        return response()->json(['data' => $attachment], 201);
    }

    public function download(Attachment $attachment)
    {
        $this->authorize('view', $attachment->task);

        abort_unless(Storage::disk($attachment->disk)->exists($attachment->path), 404);

        return Storage::disk($attachment->disk)->download($attachment->path, $attachment->original_name);
    }

    public function destroy(Attachment $attachment): JsonResponse
    {
        $this->authorize('delete', $attachment);

        Storage::disk($attachment->disk)->delete($attachment->path);

        $attachment->delete();

        return response()->json([], 204);
    }
}
