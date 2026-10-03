<?php

namespace Database\Factories;

use App\Models\Absence;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Database\Factories\Concerns\GeneratesSampleFiles;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\File;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Absence>
 */
class AbsenceFactory extends Factory
{
    use GeneratesSampleFiles;

    public function definition(): array
    {
        $student = User::where('role', 'student')->inRandomOrder()->first()
            ?? User::inRandomOrder()->first();

        $createdAt = $this->faker->dateTimeBetween('-1 year', 'now');
        $dateFrom = Carbon::parse($createdAt)->addDay();
        $dateTo = (clone $dateFrom)->addDays(rand(0, 2));
        $confirmedAt = Carbon::parse($createdAt)->addDays(rand(1, 3));
        $status = $this->faker->randomElement(['pending', 'approved', 'approved', 'rejected']);

        // Matches the real "{MMDDYY}{daily-seq}" format from
        // GeneratesSequenceCode/AbsentFormController::store().
        $prefix = Carbon::parse($createdAt)->format('mdy');
        $sequence = Absence::where('form_number', 'like', "{$prefix}%")->count() + 1;

        return [
            'form_number' => $prefix . str_pad($sequence, 2, '0', STR_PAD_LEFT),
            'student_id' => $student?->id,
            'reason' => json_encode([$this->faker->randomElement(['Excused Absence', 'Excused Tardiness'])]),
            'evidences' => null, // filled in by configure() below, once the folder/files exist
            'note' => $status !== 'pending' ? $this->faker->sentence(6) : null,
            'rejected_reason' => $status === 'rejected' ? $this->faker->sentence(8) : null,
            'rejected_at' => $status === 'rejected' ? $confirmedAt : null,
            'confirmed_at' => $status === 'approved' ? $confirmedAt : null,
            'date_from' => $dateFrom->format('Y-m-d'),
            'date_to' => $dateTo->format('Y-m-d'),
            'archived_at' => $status !== 'pending' ? Carbon::parse($confirmedAt)->addYears(5) : null,
            'created_at' => $createdAt,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Absence $absence) {
            $folder = storage_path("app/private/absent-forms/absent-form-{$absence->form_number}");
            $evidencesFolder = "{$folder}/evidences";
            File::ensureDirectoryExists($evidencesFolder);

            $count = random_int(1, 3);
            $evidences = [];
            for ($i = 1; $i <= $count; $i++) {
                $fileName = "{$i}-{$absence->form_number}.jpg";
                $this->makePlaceholderImage("{$evidencesFolder}/{$fileName}", 'Absence Evidence');
                $evidences[] = ['file' => $fileName];
            }
            $absence->update(['evidences' => json_encode($evidences)]);

            if ($absence->confirmed_at) {
                $student = User::with(['profile', 'program'])->find($absence->student_id);
                $prefect = User::with('profile')->where('role', 'sub_admin')->first();

                $data = [
                    'sender_name' => trim("{$student?->profile?->first_name} {$student?->profile?->middle_name} {$student?->profile?->last_name}"),
                    'prefect_name' => trim("{$prefect?->profile?->first_name} {$prefect?->profile?->middle_name} {$prefect?->profile?->last_name}"),
                    'date_from' => $absence->date_from,
                    'date_to' => $absence->date_to,
                    'reason' => implode(', ', json_decode($absence->reason, true)),
                    'date_approve' => Carbon::parse($absence->confirmed_at)->toFormattedDateString(),
                    'status' => 'Approved',
                    'note' => $absence->note,
                    'program' => $student?->program?->name,
                    'student_id' => $student?->id_number,
                ];

                Pdf::loadView('pdf.absent-form-approval', $data)
                    ->save("{$folder}/absent-form-approval-{$student?->id}-{$absence->form_number}.pdf");
            }
        });
    }
}
