<?php

namespace App\Jobs;

use App\Events\CsvRowProcessed;
use App\Http\Controllers\Modules\Account\AccountController;
use App\Models\CsvImportRowResult;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\SchoolYearSemester;
use App\Models\User;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Updates one existing student's enrollment record from a reviewed CSV row —
 * the bulk counterpart to AccountController::updateEnrollment(). Never
 * creates a user; matches an existing student by id_number the same way
 * every other bulk job in this app does.
 */
class ProcessEnrollmentUpdateCsvRow implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $row, $rowIndex, $total, $userId;

    public function __construct($row, $rowIndex, $total, $userId)
    {
        $this->row = $row;
        $this->rowIndex = $rowIndex;
        $this->total = $total;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $row = $this->row;
        $idNumber = strtolower($row['id'] ?? '');

        $errors = AccountController::validateEnrollmentUpdateCsvRow($row);
        if (!empty($errors)) {
            $this->recordResult('error', $idNumber, '', implode(' ', $errors));
            return;
        }

        $student = User::where('id_number', $idNumber)->where('role', 'student')->first();
        $fullName = trim(($student->profile->first_name ?? '') . ' ' . ($student->profile->last_name ?? ''));
        $program = Program::whereRaw('LOWER(name) = ?', [strtolower(trim($row['program']))])->first();

        $currentSemester = SchoolYearSemester::current();

        if (!$currentSemester) {
            $this->recordResult('error', $idNumber, $fullName, 'No active school year/semester is configured. Set one in School Year Management before importing.');
            return;
        }

        DB::beginTransaction();
        try {
            Enrollment::updateOrInsert(
                [
                    'student_id' => $student->id,
                    'program_id' => $program->id,
                    'school_year_id' => $currentSemester->school_year_id,
                ],
                [
                    'semester' => $currentSemester->semester,
                    'year_level' => $row['year_level'],
                    'enrolled_at' => $row['enrolled_at'],
                    'status' => 'enrolled',
                ]
            );

            DB::commit();

            $this->recordResult('success', $idNumber, $fullName, null, [
                'id' => $idNumber,
                'name' => $fullName,
                'program' => $program->name,
                'year_level' => $row['year_level'],
                'semester' => $currentSemester->semester,
                'school_year' => $currentSemester->schoolYear?->year,
                'enrolled_at' => $row['enrolled_at'],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Enrollment update CSV row failed for {$idNumber}: " . $e->getMessage());
            $this->recordResult('error', $idNumber, $fullName, $e->getMessage());
        }
    }

    private function recordResult($status, $idNumber, $fullName, $message = null, $exportData = null)
    {
        $batchId = $this->batch()?->id;

        CsvImportRowResult::create([
            'batch_id' => $batchId,
            'row_index' => $this->rowIndex,
            'id_number' => $idNumber,
            'full_name' => $fullName,
            'status' => $status,
            'message' => $message,
            'export_data' => $exportData,
        ]);

        $processedCount = CsvImportRowResult::where('batch_id', $batchId)->count();

        try {
            broadcast(new CsvRowProcessed($this->userId, [
                'batch_id' => $batchId,
                'row_index' => $this->rowIndex,
                'total' => $this->total,
                'processed_count' => $processedCount,
                'id_number' => $idNumber,
                'full_name' => $fullName,
                'status' => $status,
                'message' => $message,
            ]));
        } catch (\Throwable $e) {
            Log::warning('CsvRowProcessed broadcast failed: ' . $e->getMessage());
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error('ProcessEnrollmentUpdateCsvRow failed', [
            'row_index' => $this->rowIndex,
            'error' => $exception->getMessage(),
        ]);
    }
}
