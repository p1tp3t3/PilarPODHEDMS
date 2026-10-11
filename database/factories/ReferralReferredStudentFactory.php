<?php

namespace Database\Factories;

use App\Models\Referral;
use App\Models\ReferralReferredStudent;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\File;

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
     * Renders this student's PDF into the referral's folder — only here
     * (not in ReferralFactory) do we know which student it's for.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (ReferralReferredStudent $item) {
            $referral = Referral::find($item->referral_id);
            $student = User::with(['profile', 'program', 'enrollments'])->find($item->student_id);
            $prefect = User::with('profile')->whereRole('sub_admin')->first();

            // Matches the real app: a per-student PDF only exists once the
            // referral is confirmed (ReferralController::store()/confirmReferral()).
            if (!$referral || !$student || !$referral->confirmed_at) {
                return;
            }

            $enrollment = $student->enrollments?->sortByDesc('id')->first();
            $program = trim(($student->program?->name ?? '') . ' ' . ($enrollment?->year_level ?? ''));

            $data = [
                'date_issued' => Carbon::parse($referral->created_at)->format('F d, Y'),
                'prefect_name' => trim("{$prefect?->profile?->first_name} {$prefect?->profile?->middle_name} {$prefect?->profile?->last_name}"),
                'referred_student_name' => trim("{$student->profile?->first_name} {$student->profile?->middle_name} {$student->profile?->last_name}"),
                'program' => $program,
                'referred_student_id' => $student->id_number,
                'referral_reason' => $referral->reason_description,
            ];

            $folder = storage_path("app/private/referrals/referral-{$referral->referral_number}");
            File::ensureDirectoryExists($folder);

            Pdf::loadView('pdf.referral-guidance', $data)
                ->save("{$folder}/referral-student-{$student->id}-{$referral->referral_number}.pdf");
        });
    }
}
