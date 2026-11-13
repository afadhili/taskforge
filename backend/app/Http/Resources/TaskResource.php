<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'project_id' => $this->project_id, 'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? new UserResource($this->assignee) : null), 'title' => $this->title, 'description' => $this->description, 'status' => $this->status, 'priority' => $this->priority, 'deadline' => $this->deadline?->toDateString(), 'date_assigned' => $this->date_assigned?->toDateString(), 'estimate_minutes' => $this->estimate_minutes, 'position' => $this->position, 'dependencies' => $this->whenLoaded('dependencies', fn () => $this->dependencies->pluck('id')), 'labels' => $this->whenLoaded('labels', fn () => $this->labels->map(fn ($label) => ['id' => $label->id, 'name' => $label->name, 'color' => $label->color])), 'comments' => CommentResource::collection($this->whenLoaded('comments')), 'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')), 'created_at' => $this->created_at];
    }
}
