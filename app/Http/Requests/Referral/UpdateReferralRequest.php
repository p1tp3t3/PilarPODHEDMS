<?php

namespace App\Http\Requests\Referral;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class UpdateReferralRequest extends FormRequest
{
    use RateLimitsSubmissions;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'referral_reason' => 'required|string',
            'referred_students' => 'required|array|min:1',
            'referred_students.*' => 'integer|exists:users,id',
        ];
    }

    /**
     * Mirrors StoreReferralRequest — referral_reason is rich-text HTML
     * rendered unescaped into the referral PDF later, so it's sanitized
     * the same way here.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('referral_reason')) {
            $clean = strip_tags(
                (string) $this->referral_reason,
                '<p><br><strong><em><s><ul><ol><li><h1><h2><h3><blockquote>'
            );
            $clean = preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\')/i', '', $clean);

            $this->merge(['referral_reason' => $clean]);
        }
    }
}
