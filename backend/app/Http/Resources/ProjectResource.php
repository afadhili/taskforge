<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'workspace_id' => $this->workspace_id, 'name' => $this->name, 'key' => $this->key, 'description' => $this->description, 'status' => $this->status, 'start_date' => $this->start_date, 'due_date' => $this->due_date, 'progress' => $this->when(isset($this->tasks_count), fn () => $this->tasks_count === 0 ? 0 : (int) round(100 * $this->done_tasks_count / $this->tasks_count)), 'tasks_count' => $this->whenCounted('tasks'), 'created_at' => $this->created_at];
    }
}
