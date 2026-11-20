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

    // No saved form: a referral's form is built from the record whenever it
    // is opened (Referral::renderDocumentPdf()), so there is nothing to save.
}
