<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SprintUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date', 'after_or_equal:starts_at'],
            'status' => ['sometimes', 'in:planned,active,completed,cancelled'],
            'task_ids' => ['sometimes', 'array'],
            'task_ids.*' => ['integer', 'exists:tasks,id'],
        ];
    }
}
