<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkspaceStoreRequest;
use App\Http\Resources\WorkspaceResource;
use App\Models\User;
use App\Models\Workspace;
use App\Services\WorkspaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    public function __construct(protected WorkspaceService $service) {}

    public function index(Request $request): JsonResponse
    {
        $workspaces = $request->user()->workspaces()->withCount(['members', 'projects'])->paginate(min($request->integer('per_page', 15), 100));

        return response()->json(WorkspaceResource::collection($workspaces)->response()->getData(true));
    }

    public function store(WorkspaceStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Workspace::class);

        $workspace = $this->service->create($request->user(), $request->validated('name'));

        return (new WorkspaceResource($workspace))->response()->setStatusCode(201);
    }

    public function show(Workspace $workspace): WorkspaceResource
    {
        $this->authorize('view', $workspace);

        return new WorkspaceResource($workspace->loadCount(['members', 'projects']));
    }

    public function update(Request $request, Workspace $workspace): WorkspaceResource
    {
        $this->authorize('update', $workspace);

        $workspace->update($request->validate(['name' => ['sometimes', 'required', 'string', 'max:120']]));

        return new WorkspaceResource($workspace->refresh());
    }

    public function destroy(Workspace $workspace): JsonResponse
    {
        $this->authorize('delete', $workspace);

        $workspace->delete();

        return response()->json([], 204);
    }

    public function members(Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        return response()->json(['data' => $this->service->members($workspace)]);
    }

    public function addMember(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('update', $workspace);

        $data = $request->validate(['email' => ['required', 'email', 'exists:users,email'], 'role' => ['required', 'in:admin,member,viewer']]);

        $member = User::where('email', $data['email'])->firstOrFail();

        if ($workspace->members()->whereKey($member->id)->exists()) {
            return response()->json(['message' => 'User is already a workspace member.'], 409);
        }

        return response()->json(['data' => $this->service->addMember($workspace, $member, $data['role'])], 201);
    }

    public function updateMember(Request $request, Workspace $workspace, User $member): JsonResponse
    {
        $this->authorize('update', $workspace);

        $this->service->updateMember($workspace, $member, $request->validated('role'));

        return response()->json(['message' => 'Role updated.']);
    }

    public function removeMember(Workspace $workspace, User $member): JsonResponse
    {
        $this->authorize('removeMember', [$workspace, $member]);

        $this->service->removeMember($workspace, $member);

        return response()->json([], 204);
    }

    public function labels(Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        return response()->json(['data' => $this->service->labels($workspace)]);
    }

    public function createLabel(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('update', $workspace);

        $data = $request->validate(['name' => ['required', 'string', 'max:60'], 'color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/']]);

        $label = $this->service->createLabel($workspace, $data['name'], $data['color'] ?? null);

        return response()->json(['data' => $label->only(['id', 'name', 'color'])], 201);
    }
}
