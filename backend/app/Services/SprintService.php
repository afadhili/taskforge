<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Sprint;
use Illuminate\Validation\ValidationException;

class SprintService
{
    public function create(Project $project, array $attributes, array $taskIds = []): Sprint
    {
        $this->validateTaskIds($project, $taskIds);

        $sprint = $project->sprints()->create($attributes);

        if ($taskIds !== []) {
            $sprint->tasks()->sync($taskIds);
        }

        return $sprint->load('tasks');
    }

    public function update(Sprint $sprint, array $attributes): Sprint
    {
        if (isset($attributes['task_ids'])) {
            $this->validateTaskIds($sprint->project, $attributes['task_ids']);
            $sprint->tasks()->sync($attributes['task_ids']);
            unset($attributes['task_ids']);
        }

        $sprint->update($attributes);

        return $sprint->fresh()->load('tasks');
    }

    public function delete(Sprint $sprint): void
    {
        $sprint->delete();
    }

    private function validateTaskIds(Project $project, array $taskIds): void
    {
        if ($taskIds === []) {
            return;
        }

        if ($project->tasks()->whereIn('id', $taskIds)->count() !== count($taskIds)) {
            throw ValidationException::withMessages(['task_ids' => ['Sprint tasks must belong to this project.']]);
        }
    }
}
