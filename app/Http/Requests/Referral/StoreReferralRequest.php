<?php

namespace App\Http\Requests\Referral;

use App\Rules\EnrolledStudent;
use Illuminate\Foundation\Http\FormRequest;

class StoreReferralRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'referrer_id' => 'nullable|integer|exists:users,id',
            'referral_reason' => 'required|string',
            'referred_students' => 'required|array|min:1',
            'referred_students.*' => ['integer', 'exists:users,id', new EnrolledStudent],
        ];
    }

    /**
     * referral_reason arrives as rich-text HTML from the referral editor —
     * strip everything except the formatting tags it can actually produce
     * (and any lingering event-handler attributes) before it's stored and
     * later rendered, unescaped, into the referral PDF.
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
