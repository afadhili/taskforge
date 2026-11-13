<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'original_name' => $this->original_name, 'mime_type' => $this->mime_type, 'size' => $this->size, 'download_url' => url('/api/v1/attachments/'.$this->id), 'uploader' => $this->whenLoaded('uploader', fn () => new UserResource($this->uploader)), 'created_at' => $this->created_at];
    }
}
