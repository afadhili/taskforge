<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(protected AnalyticsService $service) {}

    public function project(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json(['data' => $this->service->forProject($project)]);
    }
}
