<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $fields = [
            // "guard"/"guidance" aren't real roles — they're
            // non_teaching_staff positions, and the users.role column's
            // enum would reject an INSERT of either literal value.
            'role' => 'required|in:student,super_admin,sub_admin,teaching_staff,non_teaching_staff,parent',
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
