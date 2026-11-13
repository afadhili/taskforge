<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\TaskStoreRequest;
use App\Http\Requests\TaskUpdateRequest;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use App\Services\ActivityService;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(protected TaskService $service, protected ActivityService $activity) {}

    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $query = $project->tasks()->with(['assignee', 'dependencies', 'labels'])->orderBy('position')->orderByDesc('created_at');

        foreach (['status', 'priority', 'assignee_id'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        $tasks = $query->paginate(min($request->integer('per_page', 100), 100));

        return response()->json(TaskResource::collection($tasks)->response()->getData(true));
    }

    public function store(TaskStoreRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validated();

        if (! empty($data['assignee_id']) && ! $project->workspace->members()->whereKey($data['assignee_id'])->exists()) {
            abort(422, 'Assignee must belong to this workspace.');
        }

        return (new TaskResource($this->service->create($request->user(), $project->id, $data)))->response()->setStatusCode(201);
    }

    public function show(Task $task): TaskResource
    {
        $this->authorize('view', $task);

        return new TaskResource($task->load(['assignee', 'dependencies', 'labels', 'comments.user', 'attachments.uploader']));
    }

    public function update(TaskUpdateRequest $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        $data = $request->validated();

        if (! empty($data['assignee_id']) && ! $task->project->workspace->members()->whereKey($data['assignee_id'])->exists()) {
            abort(422, 'Assignee must belong to this workspace.');
        }

        return new TaskResource($this->service->update($request->user(), $task, $data));
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $task->delete();

        return response()->json([], 204);
    }

    public function dependencies(Request $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        $data = $request->validate(['dependency_ids' => ['required', 'array', 'max:100'], 'dependency_ids.*' => ['integer', 'distinct', 'exists:tasks,id']]);

        return new TaskResource($this->service->setDependencies($request->user(), $task, $data['dependency_ids']));
    }

    public function comments(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $data = $request->validate(['body' => ['required', 'string', 'max:10000']]);

        $comment = $this->service->addComment($request->user(), $task, $data['body']);

        return response()->json(['data' => $comment], 201);
    }

    public function activity(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json($this->activity->getTaskActivity($task)->with('user:id,name')->orderByDesc('id')->paginate(30));
    }
}
