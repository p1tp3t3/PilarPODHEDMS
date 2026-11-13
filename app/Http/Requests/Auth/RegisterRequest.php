<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    use RateLimitsSubmissions;

    /** Submissions allowed per minute. */
    protected int $perMinute = 20;

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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    // Manual registration: the username is generated, never typed.
    protected function prepareForValidation(): void
    {
        if (! $this->hasFile('file') && ! $this->has('file')) {
            $this->merge(['username' => registration_username($this->first_name, $this->last_name)]);
        }
    }

    public function rules(): array
    {
        $fields = [
            // "guard"/"guidance" aren't real roles — they're
            // non_teaching_staff positions, not rows in the roles table.
            'role' => 'required|exists:roles,name,is_active,1',
        ];
        return (request()->has('file') ? array_merge($fields, [
            'file' => 'required|file',
        ]) : array_merge($fields, [
            'id_number' => 'nullable|unique:users,id_number',
            'username' => 'required|alpha_num|max:255|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
        ]));
    }
}
