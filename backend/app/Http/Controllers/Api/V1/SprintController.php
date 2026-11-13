<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SprintStoreRequest;
use App\Http\Requests\SprintUpdateRequest;
use App\Models\Project;
use App\Models\Sprint;
use App\Services\SprintService;
use Illuminate\Http\JsonResponse;

class SprintController extends Controller
{
    public function __construct(protected SprintService $service) {}

    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json(['data' => $project->sprints()
            ->withCount(['tasks', 'tasks as completed_tasks_count' => fn ($query) => $query->where('status', 'done')])
            ->orderByDesc('starts_at')
            ->get()]);
    }

    public function store(SprintStoreRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validated();

        $taskIds = $data['task_ids'] ?? [];
        unset($data['task_ids']);

        $sprint = $this->service->create($project, $data, $taskIds);

        return response()->json(['data' => $sprint], 201);
    }

    public function show(Sprint $sprint): JsonResponse
    {
        $this->authorize('view', $sprint->project);

        return response()->json(['data' => $sprint->load('tasks')]);
    }

    public function update(SprintUpdateRequest $request, Sprint $sprint): JsonResponse
    {
        $this->authorize('update', $sprint->project);

        $data = $request->validated();

        $sprint = $this->service->update($sprint, $data);

        return response()->json(['data' => $sprint]);
    }

    public function destroy(Sprint $sprint): JsonResponse
    {
        $this->authorize('update', $sprint->project);

        $this->service->delete($sprint);

        return response()->json([], 204);
    }
}
