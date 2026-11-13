<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TaskStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:20000'],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['sometimes', 'in:backlog,todo,in_progress,in_review,done'],
            'priority' => ['sometimes', 'in:low,medium,high,urgent'],
            'deadline' => ['nullable', 'date'],
            'estimate_minutes' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'label_ids' => ['sometimes', 'array', 'max:20'],
            'label_ids.*' => ['integer', 'exists:task_labels,id'],
        ];
    }
}
