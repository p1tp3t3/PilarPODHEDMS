<?php

namespace App\Http\Controllers\Modules\Account;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessStudentCsvRow;
use App\Jobs\ProcessUserAccountGenerationCSV;
use App\Events\CsvBatchCompleted;
use App\Models\CsvImportRowResult;
use App\Models\EducationBackground;
use App\Models\Enrollment;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\Parents;
use App\Models\Profile;
use App\Models\Program;
use App\Models\SchoolYear;
use App\Models\TeachingStaff;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\ParentAccountMail;
use App\Models\ActionLog;
use Exception;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use ZipArchive;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function index()
    {
        $student = new User();

        return Inertia::render("itrc/register", [
            'user' => auth()->user(),
            'authType' => auth()->user()->role,
            'student' => $student->getAllStudent(),
            'program' => Program::select('id', 'name', 'description')->get(),
            'program_name' => is_program_head(),
            'school_years' => SchoolYear::orderByDesc('year')->get(['id', 'year']),
        ]);
    }

    public function parentRegistrationIndex() {
        $programs = Program::all(['id', 'name']);
        return Inertia::render('parent-registration', [
            'programs' => $programs
        ]);
    }

    public function generateParentId()
    {
        $prefix = 'p';
        $year = date('Y');

        // Get last ID from the database, keyed off the human-readable id_number
        $lastRecord = User::where('role', 'parent')->orderBy('id_number', 'desc')->first();

        if (!$lastRecord || !$lastRecord->id_number) {
            // No records yet — first ID = pYYYY01
            $increment = 1;
        } else {
            // Extract last 2 digits (increment part)
            $lastId = $lastRecord->id_number; // Example: p202501

            // Remove 'p' prefix and year (first 5 chars: p2025)
            $increment = intval(substr($lastId, 5)) + 1;
        }

        // Pad to 2 digits (01, 02, 03...)
        $incrementFormatted = str_pad($increment, 2, '0', STR_PAD_LEFT);

        return $prefix . $year . $incrementFormatted;
    }

    public function store(RegisterRequest $request)
    {
        if ($request->validated()) {
            DB::beginTransaction(); // 🧱 Start Transaction

            try {
                $role = request('role');
                $position = request('position');

                if (in_array($role, ['super_admin', 'sub_admin'])) {
                    $admin = User::where('role', $role);

                    if ($admin->count() < 2 || $admin->exists()) {
                        $this->createUser($request);

                        ActionLog::create([
                            'user_id' => auth()->user()->id,
                            'action_type' => 'register',
                            'details' => 'registers a ' . $role . ' account manually',
                        ]);

                        DB::commit();
                        return response()->json(['message' => 'Registered Successfully']);
                    }

                    DB::rollBack();
                    $type = ucwords(str_replace('_', ' ', $role));
                    return response()->json(['message' => "There's Already a $type Account."], 400);

                } elseif ($role === 'teaching_staff' && $position === 'program_head') {
                    $program = Program::with('programHead')
                        ->where('id', request('program'))
                        ->first();

                    if (!$program) {
                        DB::rollBack();
                        return response()->json(['message' => 'Program not found.'], 404);
                    }

                    $hasDean = $program->programHead;

                    if (!$hasDean) {
                        $this->createUser($request);

                        ActionLog::create([
                            'user_id' => auth()->user()->id,
                            'action_type' => 'register',
                            'details' => 'registers a program head account manually',
                        ]);

                        DB::commit();
                        return response()->json(['message' => 'Registered Successfully']);
                    }

                    DB::rollBack();
                    $programName = $program->name ?? 'This program';
                    return response()->json([
                        'message' => "Program Head of {$programName} already exists."
                    ], 400);

                } else {
                    $result = $this->createUser($request);

                    ActionLog::create([
                        'user_id' => auth()->user()->id,
                        'action_type' => 'register',
                        'details' => 'registers a ' . $role . ' account manually',
                    ]);

                    DB::commit();
                    return $result;
                }
            } catch (Exception $e) {
                DB::rollBack(); // ❌ Undo all changes
                Log::error('Registration Failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
                return response()->json(['message' => 'Registration failed.', 'error' => $e->getMessage()], 500);
            }
        }
    }

    public function parentStore(Request $request) {
        DB::beginTransaction();
        try {
            $this->createUser($request);
            DB::commit();
        }catch(Exception $x) {
            DB::rollBack();
        }
    }

    public function createUser($request)
    {
        try {
            $role = $request->role;
            $position = $request->position;
            $plainPassword = $request->password ?? '********';

            $userFields = self::getUserField($request);
            $profileFields = self::getProfileField($request);
            $fullName = "{$profileFields['first_name']} {$profileFields['middle_name']} {$profileFields['last_name']}";

            switch ($role) {
                /** ================= STUDENT ================= */
                case 'student':
                    $programId = $request->program;
                    $programName = Program::where('id', $programId)->value('name');
                    $yearLevel = $request->year_level;

                    $zipPath = storage_path("app/private/zips/student-{$programId}-{$programName}.zip");
                    $csvName = "student-account-{$programId}-{$programName}-year-{$yearLevel}.csv";

                    if (!file_exists($zipPath)) {
                        throw new Exception("Student account ZIP file for {$programName} does not exist.");
                    }

                    $user = User::create($userFields);
                    Profile::create(array_merge(['user_id' => $user->id], $profileFields));
                    UserPermission::create(array_merge(['user_id' => $user->id], get_user_access_field([], $role)));

                    Enrollment::create([
                        'student_id' => $user->id,
                        'program_id' => $programId,
                        'school_year_id' => $request->school_year_id,
                        'semester' => $request->semester ?? 1,
                        'year_level' => $yearLevel,
                        'enrolled_at' => $request->enrolled_at ?? now(),
                    ]);

                    EducationBackground::insert([
                        ['student_id' => $user->id, 'education_type' => 'senior_high_school', 'transferee' => 0],
                        ['student_id' => $user->id, 'education_type' => 'college', 'transferee' => 0],
                        ['student_id' => $user->id, 'education_type' => 'college', 'transferee' => 1],
                    ]);

                    // ✅ Append student to ZIP
                    $tmpExtractDir = storage_path("app/tmp_zip_append");
                    if (File::exists($tmpExtractDir)) File::deleteDirectory($tmpExtractDir);
                    File::makeDirectory($tmpExtractDir, 0755, true);

                    $row = [
                        $user->id_number,
                        $fullName,
                        $programName ?? 'unknown',
                        $yearLevel,
                        $user->username,
                        $plainPassword
                    ];

                    $zip = new \ZipArchive();
                    if ($zip->open($zipPath) === true) {
                        $zip->extractTo($tmpExtractDir);
                        $zip->close();

                        $csvPath = "{$tmpExtractDir}/{$csvName}";
                        $rows = [];
                        $header = ['id', 'name', 'program', 'year_level', 'username', 'password'];

                        if (file_exists($csvPath)) {
                            $rows = array_map('str_getcsv', file($csvPath));
                            $header = array_shift($rows);
                            $rows = array_filter($rows, fn($r) => strtolower($r[0]) !== strtolower($user->id_number ?? ''));
                        }

                        $rows[] = $row;

                        $fp = fopen($csvPath, 'w');
                        fputcsv($fp, $header);
                        foreach ($rows as $r) fputcsv($fp, $r);
                        fclose($fp);

                        $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
                        foreach (File::files($tmpExtractDir) as $f) {
                            $zip->addFile($f->getRealPath(), $f->getFilename());
                        }
                        $zip->close();

                        File::deleteDirectory($tmpExtractDir);
                    }

                    return response()->json(['message' => 'Student Registered and CSV Updated Successfully']);

                /** ================= TEACHING STAFF (faculty / program head) ================= */
                case 'teaching_staff':
                    $programId = $request->program;
                    $programName = Program::where('id', $programId)->value('name');
                    $csvPath = storage_path("app/private/zips/faculty-account-{$programId}-{$programName}.csv");

                    if (!file_exists($csvPath)) {
                        throw new Exception("Faculty CSV file for {$programName} does not exist.");
                    }

                    $user = User::create($userFields);
                    Profile::create(array_merge(['user_id' => $user->id], $profileFields));
                    UserPermission::create(array_merge(['user_id' => $user->id], get_user_access_field([], $role)));

                    TeachingStaff::create([
                        'user_id' => $user->id,
                        'program_id' => $programId,
                        'position' => $position ?? 'faculty',
                    ]);

                    $row = [
                        $user->id_number,
                        $fullName,
                        $programName ?? 'unknown',
                        $user->username,
                        $plainPassword
                    ];

                    $rows = array_map('str_getcsv', file($csvPath));
                    $header = array_shift($rows);
                    $rows = array_filter($rows, fn($r) => strtolower($r[0]) !== strtolower($user->id_number ?? ''));
                    $rows[] = $row;

                    $fp = fopen($csvPath, 'w');
                    fputcsv($fp, $header);
                    foreach ($rows as $r) fputcsv($fp, $r);
                    fclose($fp);

                    return response()->json(['message' => 'Teaching Staff Registered and CSV Updated Successfully']);

                /** ================= NON-TEACHING STAFF ================= */
                case 'non_teaching_staff':
                    $csvPath = storage_path("app/private/zips/staff-account.csv");

                    if (!file_exists($csvPath)) {
                        throw new Exception("Staff CSV file does not exist.");
                    }

                    $user = User::create($userFields);
                    Profile::create(array_merge(['user_id' => $user->id], $profileFields));
                    UserPermission::create(array_merge(['user_id' => $user->id], get_user_access_field([], $role)));

                    $row = [
                        $user->id_number,
                        $fullName,
                        $user->username,
                        $plainPassword
                    ];

                    $rows = array_map('str_getcsv', file($csvPath));
                    $header = array_shift($rows);
                    $rows = array_filter($rows, fn($r) => strtolower($r[0]) !== strtolower($user->id_number ?? ''));
                    $rows[] = $row;

                    $fp = fopen($csvPath, 'w');
                    fputcsv($fp, $header);
                    foreach ($rows as $r) fputcsv($fp, $r);
                    fclose($fp);

                    return response()->json(['message' => 'Staff Registered and CSV Updated Successfully']);

                /** ================= OTHERS ================= */
                case 'super_admin':
                case 'sub_admin':
                    $user = User::create($userFields);
                    Profile::create(array_merge(['user_id' => $user->id], $profileFields));
                    UserPermission::create(array_merge(['user_id' => $user->id], get_user_access_field([], $role)));
                    break;

                case 'parent':
                    $user = User::create($userFields);
                    Profile::create(array_merge(['user_id' => $user->id], $profileFields));
                    UserPermission::create(array_merge(['user_id' => $user->id], get_user_access_field([], $role)));
                    Parents::create([
                        'user_id' => $user->id,
                        'parent_role' => $request->parent_role,
                        'work_occupation' => $request->work_occupation ?? $request->occupation,
                    ]);
                    break;
                default:
                    $user = User::create($userFields);
                    Profile::create(array_merge(['user_id' => $user->id], $profileFields));
                    UserPermission::create(array_merge(['user_id' => $user->id], get_user_access_field([], $role)));
                    break;
            }

            return response()->json(['message' => 'Registered Successfully']);

        } catch (Exception $e) {
            DB::rollBack(); // 🔥 Rollback if error occurs inside this function
            Log::error('CreateUser Failed: ' . $e->getMessage());
            return response()->json(['message' => 'Error creating user', 'error' => $e->getMessage()], 500);
        }
    }


    public function uploadUserStore(RegisterRequest $request)
    {
        if ($request->validated()) {

            $role = request()->role;
            $position = request()->position;
            $activate = filter_var(request()->activate, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;

            // Save uploaded CSV
            $path = storage_path("app/private/zips/user_dataset.csv");
            try {
                if (File::exists($path)) {
                    return response()->json([
                        'status'  => 'locked',
                        'message' => 'Your previous CSV is still being processed. Please wait until it finishes.'
                    ], 423);
                }
                File::delete($path);
                File::put($path, request()->file('file')->getContent());

                // Dispatch job
                $dateRegistered = DB::select("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d') AS today")[0]->today;
                ProcessUserAccountGenerationCSV::dispatch(
                    $path, $role, $activate, auth()->user()->id, $dateRegistered
                );

                // Log action
                ActionLog::create([
                    'user_id' => auth()->user()->id,
                    'action_type' => 'register',
                    'details' => 'uploads a ' . $role . ' csv file for automatic account generation',
                ]);

                return response()->json([
                    'message' => "Successfully processed all users."
                ]);
            }catch (\Throwable $e) {
                File::delete($path);
                return response()->json([
                    'message' => "There was an error."
                ], 400);
            }
        }
    }

    /** Preview a student CSV: parse + validate every row, write nothing. */
    public function previewStudentCsv(Request $request)
    {
        $request->validate(['file' => 'required|file']);

        $tmpPath = $request->file('file')->getRealPath();
        $rows = get_user_df($tmpPath);

        $preview = [];
        foreach ($rows as $i => $row) {
            $errors = self::validateStudentCsvRow($row);
            $preview[] = [
                'row_index' => $i,
                'data' => $row,
                'valid' => empty($errors),
                'errors' => $errors,
            ];
        }

        return response()->json(['rows' => $preview]);
    }

    /** Re-validate a single row after the admin edits it in the review grid, before committing. */
    public function validateStudentCsvRowRequest(Request $request)
    {
        $errors = self::validateStudentCsvRow($request->row ?? []);

        return response()->json(['valid' => empty($errors), 'errors' => $errors]);
    }

    /** Commit the reviewed rows: one queued job per student, batched, with live progress. */
    public function commitStudentCsv(Request $request)
    {
        $request->validate([
            'rows' => 'required|array|min:1',
            'activate' => 'nullable',
        ]);

        $userId = auth()->user()->id;
        $lockKey = "csv-batch-lock:student:{$userId}";

        if (Cache::has($lockKey)) {
            return response()->json([
                'status' => 'locked',
                'message' => 'Your previous student CSV batch is still being processed. Please wait until it finishes.',
            ], 423);
        }

        $activate = filter_var($request->activate, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $rows = $request->rows;
        $total = count($rows);

        $jobs = [];
        foreach ($rows as $i => $row) {
            $jobs[] = new ProcessStudentCsvRow($row, $i, $total, $activate, $userId);
        }

        $batch = Bus::batch($jobs)
            ->then(function ($batch) use ($userId, $lockKey) {
                $results = CsvImportRowResult::where('batch_id', $batch->id)->get();

                $grouped = [];
                foreach ($results->where('status', 'success') as $r) {
                    $d = $r->export_data;
                    $key = "{$d['program_id']}_{$d['year_level']}";
                    if (!isset($grouped[$key])) {
                        $grouped[$key] = [['id', 'name', 'program', 'year_level', 'username', 'password']];
                    }
                    $grouped[$key][] = [$d['id'], $d['name'], $d['program_name'], $d['year_level'], $d['username'], $d['password']];
                }
                ProcessStudentCsvRow::exportGroupedResults($grouped);

                Cache::forget($lockKey);

                try {
                    broadcast(new CsvBatchCompleted($userId, [
                        'batch_id' => $batch->id,
                        'total' => $results->count(),
                        'success_count' => $results->where('status', 'success')->count(),
                        'error_count' => $results->where('status', 'error')->count(),
                        'errors' => $results->where('status', 'error')->map(fn($r) => [
                            'row_index' => $r->row_index,
                            'id_number' => $r->id_number,
                            'full_name' => $r->full_name,
                            'message' => $r->message,
                        ])->values(),
                    ]));
                } catch (\Throwable $e) {
                    Log::warning('CsvBatchCompleted broadcast failed: ' . $e->getMessage());
                }
            })
            ->finally(function ($batch) use ($lockKey) {
                Cache::forget($lockKey);
            })
            ->name('student-csv-' . now()->timestamp)
            ->dispatch();

        Cache::put($lockKey, $batch->id, now()->addHours(2));

        ActionLog::create([
            'user_id' => $userId,
            'action_type' => 'register',
            'details' => 'uploads a student csv file for automatic account generation',
        ]);

        return response()->json(['batch_id' => $batch->id]);
    }

    public static function validateStudentCsvRow(array $row): array
    {
        $errors = [];
        $required = ['id', 'first_name', 'middle_name', 'last_name', 'sex', 'email', 'program', 'year_level', 'school_year', 'enrolled_at'];

        foreach ($required as $col) {
            if (!isset($row[$col]) || trim((string) $row[$col]) === '') {
                $errors[] = "'$col' cannot be empty.";
            }
        }

        if (empty($errors)) {
            if (!preg_match('/^[Cc]\d+$/', $row['id'])) {
                $errors[] = "Invalid ID format. Must start with 'C' followed by digits (e.g. C2210213).";
            }
            foreach (['first_name', 'middle_name', 'last_name'] as $nameField) {
                if (!preg_match('/^[A-Za-z\s]+$/', trim($row[$nameField]))) {
                    $errors[] = "'$nameField' must contain letters and spaces only.";
                }
            }
            if (!in_array(strtolower($row['sex']), ['m', 'f'])) {
                $errors[] = "Sex must be 'm' or 'f'.";
            }
            if (!filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Invalid email format.';
            }
            if (!Program::whereRaw('LOWER(name) = ?', [strtolower(trim($row['program']))])->exists()) {
                $errors[] = 'Program must match an existing program name (e.g. BSIT, BEED, BSN).';
            }
            if (!is_numeric($row['year_level']) || $row['year_level'] < 1 || $row['year_level'] > 4) {
                $errors[] = 'Year level must be 1–4.';
            }
            if (!preg_match('/^\d{4}-\d{4}$/', $row['school_year'])) {
                $errors[] = 'school_year must be YYYY-YYYY.';
            } elseif (!\App\Models\SchoolYear::where('year', $row['school_year'])->exists()) {
                $errors[] = "school_year '{$row['school_year']}' does not exist. Create it first in School Year Management.";
            }
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $row['enrolled_at']) || !strtotime($row['enrolled_at'])) {
                $errors[] = 'enrolled_at must be a valid date in YYYY-MM-DD format.';
            }
            if (isset($row['suffix']) && trim($row['suffix']) !== '' && !preg_match('/^[A-Za-z.\s]+$/', trim($row['suffix']))) {
                $errors[] = "'suffix' must contain letters, periods, and spaces only.";
            }
        }

        return $errors;
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
                'school_year', 'semester'
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
                } elseif (!\App\Models\SchoolYear::where('year', $row['school_year'])->exists()) {
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

    private function getUserField($request) {
        return [
            'id_number' => strtolower($request->id_number ?? ''),
            'role' => $request->role,
            'username' => strtolower($request->username),
            'email' => (empty($request->email)) ? NULL : strtolower($request->email),
            'activate' => $request->activate,
            'password' => Hash::make($request->password),
        ];
    }
    private function getProfileField($request) {
        return [
            'first_name' => ucwords($request->first_name),
            'middle_name' => ucwords($request->middle_name),
            'last_name' => ucwords($request->last_name),
            'suffix' => (empty($request->suffix)) ? NULL : $request->suffix,
            'date_of_birth' => NULL,
            'civil_status' => 'single',
            'profile_picture' => NULL,
            'sex' => ($request->sex != NULL) ? $request->sex : 'm',
            'contact_number' => (empty($request->contact_number)) ? NULL : $request->contact_number,
        ];
    }
    public function getParentAndStudent() {
        $parentList = User::whereNotIn('id', FamilyMember::pluck('member_id'))
                             ->with(['profile', 'parent'])
                             ->where('role', 'parent')
                             ->get();
        $studentList = User::whereNotIn('id', FamilyMember::pluck('member_id'))
                              ->with(['profile', 'program'])
                            ->where('role', 'student')
                            ->where('id', '!=', auth()->user()->id)
                            ->get();

        return [
            'parents' => $parentList,
            'students' => $studentList
        ];
    }
    private function validateAutoRegistration($list) {
        $hasAnomalies = false;
        $seenIds = [];

        foreach ($list as $rawUser) {
            $id = $rawUser['id'] ?? null;

            if ($id && in_array($id, $seenIds)) {
                $hasAnomalies = true;
                break;
            }

            $seenIds[] = $id;
        }

        return $hasAnomalies;
    }
    private function validateAdministrative($list) {
        $hasAnomalies = false;
        $seenPrograms = [];

        foreach ($list as $administrative) {
            $programId = $administrative['program'] ?? null;

            if ($programId && in_array($programId, $seenPrograms)) {
                // Duplicate found inside the list
                $hasAnomalies = true;
                break;
            }

            $seenPrograms[] = $programId;
        }

        return $hasAnomalies;
    }
    public function validateColumnData($userType, $list) {
        $hasAnomalies = false;

        $expectedColumns = [
            'teaching_staff' => ['id', 'first_name', 'middle_name', 'last_name', 'sex', 'program'],
            'student' => ['id', 'first_name', 'middle_name', 'last_name', 'sex', 'program', 'year_level', 'semester'],
            'non_teaching_staff' => ['id', 'first_name', 'middle_name', 'last_name', 'sex', 'work_type'],
        ];

        $rules = [
            'first_name'   => '/^[A-Za-z ]+$/',
            'middle_name'  => '/^[A-Za-z ]+$/',
            'last_name'    => '/^[A-Za-z ]+$/',
            'sex'          => '/^(m|f)$/i',
            'program'      => '/^[1-7]$/',
            'year_level'   => '/^[1-4]$/',
            'semester'     => '/^[1-2]$/', // assuming only 1 or 2 semesters
            'work_type'    => '/^[A-Za-z ]+$/',
        ];

        $errors = [];

        foreach ($list as $index => $row) {
            foreach ($expectedColumns[$userType] as $col) {
                $value = $row[$col] ?? null;

                if (is_null($value) || $value === '') {
                    $hasAnomalies = true;
                    break;
                }

                if (isset($rules[$col]) && !preg_match($rules[$col], (string)$value)) {
                    $hasAnomalies = true;
                    break;
                }
            }
        }

        return $hasAnomalies;
    }
    public function validateBlankFields($userType, $list) {
        $hasAnomalies = false;

        $expectedColumns = [
            'teaching_staff' => ['id', 'first_name', 'middle_name', 'last_name', 'sex', 'program'],
            'student' => ['id', 'first_name', 'middle_name', 'last_name', 'sex', 'program', 'year_level', 'semester'],
            'non_teaching_staff' => ['id', 'first_name', 'middle_name', 'last_name', 'sex', 'work_type'],
        ];

        $columns = $expectedColumns[$userType] ?? [];

        foreach ($list as $index => $user) {
            foreach ($columns as $col) {
                if (!isset($user[$col]) || empty($user[$col])) {
                    $hasAnomalies = true;
                    break;
                }
            }
        }

        return $hasAnomalies;
    }
}
