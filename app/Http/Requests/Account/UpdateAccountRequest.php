<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAccountRequest extends FormRequest
{
    use RateLimitsSubmissions;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // The account being saved: the System Admin may name another user
        // (AccountController::update); everyone else saves their own.
        $targetId = $this->user()?->role === 'super_admin' && $this->filled('user_id')
            ? (int) $this->input('user_id')
            : $this->user()?->id;

        return [
            'username' => ['nullable', 'string', Rule::unique('users', 'username')->ignore($targetId)],
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($targetId)],
            'current_password' => 'nullable|string',
            'password' => 'nullable|string|min:8|confirmed',
        ];
    }
}
