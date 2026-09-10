<?php

namespace App\Jobs;

use App\Exports\UserAccountExport;
use App\Models\EducationBackground;
use App\Models\Enrollment;
use App\Models\Profile;
use App\Models\Program;
use App\Models\SchoolYear;
use App\Models\TeachingStaff;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Illuminate\Support\Str;
use ZipArchive;

class ProcessUserAccountGenerationCSV implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 1000;
    public $csvPath, $userType, $activate, $userId, $date;

    public function __construct($csvPath, $userType, $activate, $userId, $date)
    {
        $this->csvPath = $csvPath;
        $this->userType = $userType;
        $this->activate = $activate;
        $this->userId = $userId;
        $this->date = $date;
    }

    public function handle(): void
    {
        $errorFile = [];
        DB::beginTransaction(); // ✅ Start transaction

        try {

            $userType = $this->userType; // 'student' | 'teaching_staff' | 'non_teaching_staff'
            $activate = $this->activate;
            $csvArr = get_user_df($this->csvPath);
            $grouped = [];
            $validationErrors = self::validateUserCSV($csvArr, $userType);

            if (!empty($validationErrors)) {
                throw new \Exception(json_encode($validationErrors)); // handled below
            }

            foreach ($csvArr as $csv) {
                $id = strtolower($csv['id']);
                $existingUser = User::where('id_number', $id)->first();

                // ✅ Keep old password if user exists
                if ($existingUser) {
                    $username = $existingUser->username;
                    $hashedPassword = $existingUser->password;
                    $plainPassword = $this->getOldPasswordFromZip($id, $csv, $userType);
                } else {
                    $username = generate_username($csv['first_name']);
                    $plainPassword = random_int(10000000, 99999999);
                    $hashedPassword = Hash::make($plainPassword);
                }

                $userFields = [
                    'id_number' => $id,
                    'role' => $userType,
                    'username' => $username,
                    'email' => strtolower($csv['email']),
                    'activate' => $activate,
                ];

                if (!$existingUser) {
                    $userFields['password'] = $hashedPassword;
                }

                User::updateOrInsert(['id_number' => $id], $userFields);
                $user = User::where('id_number', $id)->first();

                Profile::updateOrInsert(['user_id' => $user->id], [
                    'first_name' => ucwords($csv['first_name']),
                    'middle_name' => ucwords($csv['middle_name']),
                    'last_name' => ucwords($csv['last_name']),
                    'sex' => strtolower($csv['sex']),
                ]);

                UserPermission::updateOrInsert(
                    ['user_id' => $user->id],
                    get_user_access_field([], $userType)
                );

                // === STUDENT ===
                if ($userType === 'student') {
                    $schoolYearId = SchoolYear::where('year', $csv['school_year'])->value('id');

                    Enrollment::updateOrInsert(
                        [
                            'student_id' => $user->id,
                            'program_id' => $csv['program'],
                            'school_year_id' => $schoolYearId,
                        ],
                        [
                            'semester' => $csv['semester'] ?? 1,
                            'year_level' => $csv['year_level'],
                            'enrolled_at' => now(),
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

                    $programId = $csv['program'];
                    $yearLevel = $csv['year_level'];
                    $groupKey = "{$programId}_{$yearLevel}";

                    if (!isset($grouped[$groupKey])) {
                        $grouped[$groupKey] = [['id', 'name', 'program', 'year_level', 'username', 'password']];
                    }

                    $grouped[$groupKey][] = $this->getUserTypeRow('student', $csv, $username, $plainPassword);
                }

                // === TEACHING STAFF (bulk upload only ever creates 'faculty' position) ===
                elseif ($userType === 'teaching_staff') {
                    TeachingStaff::updateOrInsert(
                        ['user_id' => $user->id],
                        ['program_id' => $csv['program'], 'position' => 'faculty']
                    );
                    $programId = $csv['program'];

                    if (!isset($grouped[$programId])) {
                        $grouped[$programId] = [['id', 'name', 'program', 'username', 'password']];
                    }

                    $grouped[$programId][] = $this->getUserTypeRow('teaching_staff', $csv, $username, $plainPassword);
                }
                // === NON-TEACHING STAFF or OTHER TYPES ===
                else {
                    // No dedicated table exists for non_teaching_staff-specific fields
                    // (e.g. work_type) in the current schema — only the base account
                    // (users/profiles/user_permissions) is created for this branch.
                    $baseColumn = $this->getUserTypeRow($userType, $csv, $username, $plainPassword);
                }
            }

            // ✅ Export & zip per user type
            if ($userType === 'student') {
                $this->exportStudentZipped($grouped);
            } elseif ($userType === 'teaching_staff') {
                $this->exportFacultyGrouped($grouped);
            } else {
                $fileName = $this->userTypeFileName($userType, $csvArr[0] ?? []);
                Excel::store(new UserAccountExport($baseColumn), "zips/$fileName", 'local', ExcelFormat::CSV);
            }
            Log::info($this->csvPath);
            File::delete($this->csvPath);


            // ✅ Success notification
            notify_single_user(
                self::getUserAccountGenerationNotif(true),
                [
                    'title' => 'User Account Registration',
                    'body' => 'User Accounts Have Been Successfully Generated.',
                    'url' => config('app.url'),
                    'icon' => ''
                ]
            );
            DB::commit(); // ✅ Commit transaction

        } catch (\Throwable $e) {
            DB::rollBack();
            File::delete($this->csvPath);

            $decoded = json_decode($e->getMessage(), true);

            // Initialize errorFile
            $errorFile = [
                'blob' => null,
                'filename' => null
            ];

            // If validation errors → generate txt blob
            if (is_array($decoded)) {
                $errorFile = $this->generateValidationErrorTxtBlob($decoded);
            } else {
                // Generic error message into blob
                $errorFile = $this->generateValidationErrorTxtBlob([$e->getMessage()]);
            }

            notify_single_user(
                $this->getUserAccountGenerationNotif(false, $errorFile),
                [
                    'title' => 'User Account Registration',
                    'body' => "There were errors during account generation.",
                    'url' => config('app.url'),
                    'icon' => ''
                ]
            );
        }
    }

    public static function validateUserCSV($df, $type)
    {
        $rowErrors = [];  // store errors by row number
        $flatErrors = []; // final output lines

        // RULES PER ROLE
        $rules = [
            'student' => [
                'required' => [
                    'id', 'first_name', 'middle_name', 'last_name',
                    'sex', 'email', 'program', 'year_level',
                    'school_year'
                ],
                'extra_validation' => function ($row, $rowNum, &$rowErrors) {

                    if (!is_numeric($row['program']) || $row['program'] < 1 || $row['program'] > 7) {
                        $rowErrors[$rowNum][] = "Row $rowNum: Program must be 1–7.";
                    }

                    if (!is_numeric($row['year_level']) || $row['year_level'] < 1 || $row['year_level'] > 4) {
                        $rowErrors[$rowNum][] = "Row $rowNum: Year level must be 1–4.";
                    }

                    if (!preg_match('/^\d{4}-\d{4}$/', $row['school_year'])) {
                        $rowErrors[$rowNum][] = "Row $rowNum: school_year must be YYYY-YYYY.";
                    } elseif (!SchoolYear::where('year', $row['school_year'])->exists()) {
                        $rowErrors[$rowNum][] = "Row $rowNum: school_year '{$row['school_year']}' does not exist. Create it first in School Year Management.";
                    }
                }
            ],

            'teaching_staff' => [
                'required' => [
                    'id', 'first_name', 'middle_name', 'last_name',
                    'sex', 'email', 'program'
                ],
                'extra_validation' => function ($row, $rowNum, &$rowErrors) {
                    if (!is_numeric($row['program']) || $row['program'] < 1 || $row['program'] > 7) {
                        $rowErrors[$rowNum][] = "Row $rowNum: Program must be 1–7.";
                    }
                }
            ],

            'non_teaching_staff' => [
                'required' => [
                    'id', 'first_name', 'middle_name', 'last_name',
                    'sex', 'email', 'work_type'
                ],
                'extra_validation' => function ($row, $rowNum, &$rowErrors) {
                    if (empty($row['work_type'])) {
                        $rowErrors[$rowNum][] = "Row $rowNum: work_type cannot be empty.";
                    }
                }
            ],
        ];

        // INVALID TYPE ERROR
        if (!isset($rules[$type])) {
            return ["Invalid user type '$type'.\n"];
        }

        $requiredColumns = $rules[$type]['required'];

        // PER ROW VALIDATION
        foreach ($df as $i => $row) {
            $rowNum = $i + 1;

            // REQUIRED FIELDS EMPTY
            foreach ($requiredColumns as $col) {
                if (!isset($row[$col]) || trim($row[$col]) === '') {
                    $rowErrors[$rowNum][] = "Row $rowNum: '$col' cannot be empty.";
                }
            }

            // ID FORMAT
            if (!preg_match('/^[A-Za-z0-9]+$/', $row['id'])) {
                $rowErrors[$rowNum][] = "Row $rowNum: Invalid ID format. Letters and numbers only.";
            }

            // NAME VALIDATION
            foreach (['first_name', 'middle_name', 'last_name'] as $nameField) {
                if (!preg_match('/^[A-Za-z\s]+$/', trim($row[$nameField]))) {
                    $rowErrors[$rowNum][] = "Row $rowNum: '$nameField' must contain letters and spaces only.";
                }
            }

            // SEX
            if (!in_array(strtolower($row['sex']), ['m', 'f'])) {
                $rowErrors[$rowNum][] = "Row $rowNum: Sex must be 'm' or 'f'.";
            }

            // EMAIL
            if (!filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
                $rowErrors[$rowNum][] = "Row $rowNum: Invalid email format.";
            }

            // TYPE-SPECIFIC VALIDATION
            $rules[$type]['extra_validation']($row, $rowNum, $rowErrors);
        }

        // HEADER
        $errorRows = array_keys($rowErrors);

        if(sizeOf($errorRows) != 0) {
            $flatErrors[] = "Number of Row Errors: " . count($rowErrors) . "\n";
            $flatErrors[] = "Error Rows: " . implode(", ", $errorRows) . "\n\n";

            // ROW ERROR BLOCKS
            foreach ($errorRows as $rowNum) {
                $flatErrors[] = "------------------------------------------------------------\n";
                foreach ($rowErrors[$rowNum] as $msg) {
                    $flatErrors[] = $msg . "\n";
                }
                $flatErrors[] = "------------------------------------------------------------\n";
            }
        }

        return $flatErrors;
    }



    public function getUserAccountGenerationNotif($success = true, $error = null)
{
    $message = $success
        ? "New User Accounts Have Been Successfully Generated."
        : "There Was An Error In Generating User Accounts.";

    $content = [
        'sender_notif_message'   => $message,
        'receiver_notif_message' => $message,
        'success'                => $success,
    ];

    if ($success) {
        $content['new_user_date_registered'] = $this->date;
    } else {
        $content['error_blob'] = $error['blob'] ?? null;
        $content['error_filename'] = $error['filename'] ?? null;
    }

    return [
        'notif_type'  => 'user',
        'receiver_id' => $this->userId,
        'content'     => json_encode($content),
        'read_since'  => null
    ];
}

    private function generateValidationErrorTxtBlob(array $errorLines)
    {
        $fileName = "validation-errors-" . now()->timestamp . ".txt";
        $filePath = storage_path("app/$fileName");

        // Join array into a single string for .txt
        $content = implode("", $errorLines);

        // Save file
        file_put_contents($filePath, $content);

        // Convert file to binary blob
        $blob = file_get_contents($filePath);

        // Delete the file
        unlink($filePath);

        return [
            'filename' => $fileName,
            'blob' => base64_encode($blob),
        ];
    }





    /** ✅ Read old password from ZIP/CSV if exists */
    private function getOldPasswordFromZip($userId, $csv, $userType)
    {
        $randomPassword = (string) random_int(10000000, 99999999);

        try {
            // Determine file paths
            $programId = $csv['program'] ?? null;
            $yearLevel = $csv['year_level'] ?? null;
            $programName = Str::slug(Program::where('id', $programId)->value('name') ?? 'unknown', '-');
            $extractDir = storage_path("app/tmp_zip_read");

            // Clean up any old temp directory first
            if (File::exists($extractDir)) {
                File::deleteDirectory($extractDir);
            }
            File::makeDirectory($extractDir, 0777, true, true);

            if ($userType === 'student') {
                $zipPath = storage_path("app/private/zips/student-{$programId}-{$programName}.zip");
                $csvName = "student-account-{$programId}-{$programName}-year-{$yearLevel}.csv";
            } elseif ($userType === 'teaching_staff') {
                $zipPath = storage_path("app/private/zips/faculty-account-{$programId}-{$programName}.csv");
                $csvName = "faculty-account-{$programId}-{$programName}.csv";
            } else {
                // Non-student/teaching-staff users → always new random password
                User::where('id_number', $userId)->update(['password' => Hash::make($randomPassword)]);
                return $randomPassword;
            }

            // If no ZIP exists, return a new password
            if (!file_exists($zipPath)) {
                User::where('id_number', $userId)->update(['password' => Hash::make($randomPassword)]);
                return $randomPassword;
            }

            $zip = new ZipArchive();
            if ($zip->open($zipPath) === true) {
                $zip->extractTo($extractDir);
                $zip->close();

                $csvFilePath = "{$extractDir}/{$csvName}";
                if (file_exists($csvFilePath)) {
                    $rows = array_map('str_getcsv', file($csvFilePath));

                    foreach ($rows as $row) {
                        if (isset($row[0]) && strtolower($row[0]) === strtolower($userId)) {
                            $oldPassword = $row[count($row) - 1] ?? null;

                            File::deleteDirectory($extractDir);

                            if (!empty($oldPassword)) {
                                return $oldPassword; // ✅ Found existing password
                            }
                        }
                    }
                }
            }

            // Cleanup after reading
            File::deleteDirectory($extractDir);
        } catch (\Throwable $e) {
            Log::warning("Failed to fetch old password for user {$userId}: " . $e->getMessage());
        }

        // Default fallback: generate and store a new one
        User::where('id_number', $userId)->update(['password' => Hash::make($randomPassword)]);
        return $randomPassword;
    }


    /** ✅ Export and ZIP grouped student CSVs */
    private function exportStudentZipped($grouped)
    {
        foreach ($grouped as $key => $columnData) {
            [$programId, $yearLevel] = explode('_', $key);
            $programName = Program::where('id', $programId)->value('name') ?? 'unknown';
            $programSlug = strtoupper(Str::slug($programName, '-'));

            $csvName = "student-account-{$programId}-{$programSlug}-year-{$yearLevel}.csv";
            $csvPath = storage_path("app/private/zips/{$csvName}");
            Excel::store(new UserAccountExport($columnData), "zips/{$csvName}", 'local', ExcelFormat::CSV);

            // Add to ZIP file
            $zipFile = storage_path("app/private/zips/student-{$programId}-{$programSlug}.zip");
            $zip = new ZipArchive();
            $zip->open($zipFile, ZipArchive::CREATE);
            $zip->addFile($csvPath, $csvName);
            $zip->close();

            File::delete($csvPath);
        }
    }

    /** ✅ Export grouped teaching-staff files */
    private function exportFacultyGrouped($grouped)
    {
        foreach ($grouped as $programId => $columnData) {
            $programName = Program::where('id', $programId)->value('name') ?? 'unknown';
            $fileName = "faculty-account-{$programId}-" . Str::slug($programName, '-') . ".csv";
            Excel::store(new UserAccountExport($columnData), "zips/$fileName", 'local', ExcelFormat::CSV);
        }
    }

    private function getUserTypeRow($type, $file, $username, $password)
    {
        $id = strtolower($file['id']);
        $name = trim("{$file['first_name']} {$file['middle_name']} {$file['last_name']}");

        switch ($type) {
            case 'student':
                $program = Program::where('id', $file['program'])->value('name') ?? 'unknown';
                return [$id, $name, $program, $file['year_level'], $username, $password];
            case 'teaching_staff':
                $program = Program::where('id', $file['program'])->value('name') ?? 'unknown';
                return [$id, $name, $program, $username, $password];
            default:
                return [$id, $name, $username, $password];
        }
    }

    private function userTypeFileName($type, $uniqueAtt)
    {
        $programName = !empty($uniqueAtt['program'])
            ? strtoupper((Program::where('id', $uniqueAtt['program'])->value('name') ?? 'unknown'))
            : 'general';

        return match ($type) {
            'student' => "student-account-{$uniqueAtt['program']}-$programName-year-{$uniqueAtt['year_level']}.csv",
            'teaching_staff' => "faculty-account-{$uniqueAtt['program']}-$programName.csv",
            'non_teaching_staff' => "staff-account.csv",
            'parent' => "parent-account.csv",
            default => "{$type}-account.csv"
        };
    }

    public function failed(\Throwable $exception)
    {
        Log::error("Queued job failed", [
            'userType' => $this->userType,
            'path' => $this->csvPath,
            'error' => $exception->getMessage(),
            'line' => $exception->getLine(),
            'file' => $exception->getFile(),
        ]);
    }
}
