<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'slug' => $this->slug, 'owner_id' => $this->owner_id, 'role' => $this->whenPivotLoaded('workspace_members', fn () => $this->pivot->role), 'members_count' => $this->whenCounted('members'), 'projects_count' => $this->whenCounted('projects')];
    }
}
