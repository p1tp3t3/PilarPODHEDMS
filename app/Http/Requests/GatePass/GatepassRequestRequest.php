<?php

namespace App\Http\Requests\GatePass;

use App\Models\GatePass;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class GatepassRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'other_reason' => 'nullable|string',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (auth()->user()->permissions?->allow_gatepass != 1) {
                $validator->errors()->add('gatepass', 'You are restricted from requesting a gatepass.');
                return;
            }

            $now = Carbon::now();
            $windowStart = $now->copy()->setTime(6, 0);
            $windowEnd = $now->copy()->setTime(15, 30);

            if ($now->lt($windowStart) || $now->gt($windowEnd)) {
                $validator->errors()->add('gatepass', 'You can only request a gatepass between 6:00 AM and 3:30 PM.');
                return;
            }

            $alreadyRequestedToday = GatePass::where('user_id', auth()->user()->id)
                ->whereDate('created_at', $now->toDateString())
                ->exists();

            if ($alreadyRequestedToday) {
                $validator->errors()->add('gatepass', 'You can only request one gatepass within the day.');
            }
        });
    }
}
