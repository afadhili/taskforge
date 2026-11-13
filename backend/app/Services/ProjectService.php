<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Validation\Rule;

class ProjectService
{
    public function create(Workspace $workspace, array $attributes, User $actor): Project
    {
        $this->validateKey($attributes, $workspace);

        $project = $workspace->projects()->create($attributes);

        $project->members()->attach($actor->id);

        return $project;
    }

    public function update(Project $project, array $attributes): Project
    {
        if (isset($attributes['key'])) {
            $this->validateKey($attributes, $project->workspace, $project);
        }

        $project->update($attributes);

        return $project->refresh();
    }

    public function delete(Project $project): void
    {
        $project->delete();
    }

    private function validateKey(array $attributes, Workspace $workspace, ?Project $ignoring = null): void
    {
        validator($attributes, [
            'key' => [
                Rule::unique('projects')->where('workspace_id', $workspace->id)->ignore($ignoring?->id),
            ],
        ])->validate();
    }
}
