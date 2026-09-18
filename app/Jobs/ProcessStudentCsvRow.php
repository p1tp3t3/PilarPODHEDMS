<?php

namespace App\Jobs;

use App\Events\CsvRowProcessed;
use App\Exports\UserAccountExport;
use App\Http\Controllers\Modules\Account\RegisteredUserController;
use App\Models\CsvImportRowResult;
use App\Models\EducationBackground;
use App\Models\Enrollment;
use App\Models\Profile;
use App\Models\Program;
use App\Models\SchoolYearSemester;
use App\Models\Student;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelFormat;
use ZipArchive;

class ProcessStudentCsvRow implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $row, $rowIndex, $total, $activate, $userId;

    public function __construct($row, $rowIndex, $total, $activate, $userId)
    {
        $this->row = $row;
        $this->rowIndex = $rowIndex;
        $this->total = $total;
        $this->activate = $activate;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $row = $this->row;
        $idNumber = strtolower($row['id'] ?? '');
        $fullName = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));

        $errors = RegisteredUserController::validateStudentCsvRow($row);

        if (!empty($errors)) {
            $this->recordResult('error', $idNumber, $fullName, implode(' ', $errors));
            return;
        }

        $program = Program::whereRaw('LOWER(name) = ?', [strtolower(trim($row['program'] ?? ''))])->first();

        if (!$program) {
            $this->recordResult('error', $idNumber, $fullName, "Program '{$row['program']}' does not match any existing program name.");
            return;
        }

        $currentSemester = SchoolYearSemester::current();

        if (!$currentSemester) {
            $this->recordResult('error', $idNumber, $fullName, 'No active school year/semester is configured. Set one in School Year Management before importing.');
            return;
        }

        DB::beginTransaction();
        try {
            $existingUser = User::where('id_number', $idNumber)->first();

            if ($existingUser) {
                $username = $existingUser->username;
                $hashedPassword = $existingUser->password;
                $plainPassword = $this->getOldPassword($idNumber, $program, $row['year_level'] ?? null);
            } else {
                $username = generate_username($row['first_name']);
                $plainPassword = random_int(10000000, 99999999);
                $hashedPassword = Hash::make($plainPassword);
            }

            $userFields = [
                'id_number' => $idNumber,
                'role' => 'student',
                'username' => $username,
                'email' => strtolower($row['email']),
                'activate' => $this->activate,
            ];
            if (!$existingUser) {
                $userFields['password'] = $hashedPassword;
            }

            User::updateOrInsert(['id_number' => $idNumber], $userFields);
            $user = User::where('id_number', $idNumber)->first();

            Profile::updateOrInsert(['user_id' => $user->id], [
                'first_name' => ucwords($row['first_name']),
                'middle_name' => ucwords($row['middle_name']),
                'last_name' => ucwords($row['last_name']),
                'suffix' => (empty($row['suffix'])) ? null : trim($row['suffix']),
                'sex' => strtolower($row['sex']),
            ]);

            UserPermission::updateOrInsert(
                ['user_id' => $user->id],
                get_user_access_field([], 'student')
            );

            Enrollment::updateOrInsert(
                [
                    'student_id' => $user->id,
                    'program_id' => $program->id,
                    'school_year_id' => $currentSemester->school_year_id,
                ],
                [
                    'semester' => $currentSemester->semester,
                    'year_level' => $row['year_level'],
                    'enrolled_at' => $row['enrolled_at'],
                ]
            );

            EducationBackground::updateOrInsert(
                ['student_id' => $user->id, 'education_type' => 'senior_high_school'],
                ['student_id' => $user->id, 'education_type' => 'senior_high_school']
            );
            EducationBackground::updateOrInsert(
                ['student_id' => $user->id, 'education_type' => 'college'],
                ['student_id' => $user->id, 'education_type' => 'college']
            );
            EducationBackground::updateOrInsert(
                ['student_id' => $user->id, 'education_type' => 'college', 'transferee' => 1],
                ['student_id' => $user->id, 'education_type' => 'college', 'transferee' => 1]
            );

            DB::commit();

            $this->recordResult('success', $idNumber, $fullName, null, [
                'id' => $idNumber,
                'name' => $fullName,
                'program_id' => $program->id,
                'program_name' => $program->name,
                'year_level' => $row['year_level'],
                'username' => $username,
                'password' => $plainPassword,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("CSV row failed for {$idNumber}: " . $e->getMessage());
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
            // The row result is already durably recorded above; a broadcast
            // hiccup (e.g. Reverb unreachable) must not fail/retry the job.
            Log::warning('CsvRowProcessed broadcast failed: ' . $e->getMessage());
        }
    }

    /** Mirrors ProcessUserAccountGenerationCSV::getOldPasswordFromZip, using a
     *  per-job temp dir so concurrent batch workers don't collide. */
    private function getOldPassword($idNumber, $program, $yearLevel)
    {
        $randomPassword = (string) random_int(10000000, 99999999);
        $extractDir = storage_path('app/tmp_zip_read_' . Str::random(12));

        try {
            $programId = $program->id;
            $programSlug = strtoupper(Str::slug($program->name, '-'));

            $zipPath = storage_path("app/private/zips/student-{$programId}-{$programSlug}.zip");
            $csvName = "student-account-{$programId}-{$programSlug}-year-{$yearLevel}.csv";

            if (!file_exists($zipPath)) {
                User::where('id_number', $idNumber)->update(['password' => Hash::make($randomPassword)]);
                return $randomPassword;
            }

            File::makeDirectory($extractDir, 0777, true, true);

            $zip = new ZipArchive();
            if ($zip->open($zipPath) === true) {
                $zip->extractTo($extractDir);
                $zip->close();

                $csvFilePath = "{$extractDir}/{$csvName}";
                if (file_exists($csvFilePath)) {
                    $rows = array_map('str_getcsv', file($csvFilePath));

                    foreach ($rows as $r) {
                        if (isset($r[0]) && strtolower($r[0]) === strtolower($idNumber)) {
                            $oldPassword = $r[count($r) - 1] ?? null;
                            if (!empty($oldPassword)) {
                                return $oldPassword;
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to fetch old password for student {$idNumber}: " . $e->getMessage());
        } finally {
            if (File::exists($extractDir)) {
                File::deleteDirectory($extractDir);
            }
        }

        User::where('id_number', $idNumber)->update(['password' => Hash::make($randomPassword)]);
        return $randomPassword;
    }

    /** Groups successful row export tuples by program+year and writes the same
     *  recap CSV/zip output as ProcessUserAccountGenerationCSV::exportStudentZipped. */
    public static function exportGroupedResults(array $groupedRows): void
    {
        foreach ($groupedRows as $key => $columnData) {
            [$programId, $yearLevel] = explode('_', $key);
            $programName = Program::where('id', $programId)->value('name') ?? 'unknown';
            $programSlug = strtoupper(Str::slug($programName, '-'));

            $csvName = "student-account-{$programId}-{$programSlug}-year-{$yearLevel}.csv";
            $csvPath = storage_path("app/private/zips/{$csvName}");
            Excel::store(new UserAccountExport($columnData), "zips/{$csvName}", 'local', ExcelFormat::CSV);

            $zipFile = storage_path("app/private/zips/student-{$programId}-{$programSlug}.zip");
            $zip = new ZipArchive();
            $zip->open($zipFile, ZipArchive::CREATE);
            $zip->addFile($csvPath, $csvName);
            $zip->close();

            File::delete($csvPath);
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error('ProcessStudentCsvRow failed', [
            'row_index' => $this->rowIndex,
            'error' => $exception->getMessage(),
        ]);
    }
}
