<?php

namespace Database\Factories;

use App\Models\Referral;
use App\Models\ReferralReferredStudent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReferralReferredStudent>
 */
class ReferralReferredStudentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'referral_id' => Referral::factory(),
            'student_id' => User::factory(),
        ];
    }

    /**
     * Re-renders the referral's form so it lists every student added so far
     * (each referred student is created one at a time).
     */
    public function configure(): static
    {
        return $this->afterCreating(function (ReferralReferredStudent $item) {
            $referral = Referral::find($item->referral_id);

            // Matches the real app: the form only exists once the referral
            // is confirmed (ReferralController::store()/confirmReferral()).
            if (! $referral || ! $referral->confirmed_at) {
                return;
            }

            $prefect = User::with('profile')->whereRole('sub_admin')->first()?->profile;
            $referral->saveReferralForm(trim("{$prefect?->first_name} {$prefect?->last_name}"));
        });
    }
}
