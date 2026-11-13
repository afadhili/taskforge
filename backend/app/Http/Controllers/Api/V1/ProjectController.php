<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProjectStoreRequest;
use App\Http\Requests\ProjectUpdateRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Workspace;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function __construct(protected ProjectService $service) {}

    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        $query = $workspace->projects()->withCount(['tasks', 'tasks as done_tasks_count' => fn ($q) => $q->where('status', 'done')]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $projects = $query
            ->orderBy($request->input('sort') === 'due_date' ? 'due_date' : 'created_at', $request->input('direction') === 'asc' ? 'asc' : 'desc')
            ->paginate(min($request->integer('per_page', 20), 100));

        return response()->json(ProjectResource::collection($projects)->response()->getData(true));
    }

    public function store(ProjectStoreRequest $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('createProject', $workspace);

        $project = $this->service->create($workspace, $request->validated(), $request->user());

        return (new ProjectResource($project))->response()->setStatusCode(201);
    }

    public function show(Project $project): ProjectResource
    {
        $this->authorize('view', $project);

        return new ProjectResource($project->loadCount(['tasks', 'tasks as done_tasks_count' => fn ($q) => $q->where('status', 'done')]));
    }

    public function update(ProjectUpdateRequest $request, Project $project): ProjectResource
    {
        $this->authorize('update', $project);

        return new ProjectResource($this->service->update($project, $request->validated()));
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $this->service->delete($project);

        return response()->json([], 204);
    }
}
