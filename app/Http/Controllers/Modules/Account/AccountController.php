<?php

namespace App\Http\Controllers\Modules\Account;

use App\Events\CsvBatchCompleted;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Resource\FileController;
use App\Http\Requests\Account\UpdateAccountRequest;
use App\Http\Resources\TeachingStaffResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\UserSearchResource;
use App\Jobs\ProcessEnrollmentUpdateCsvRow;
use App\Jobs\ProcessStudentAccountUpdate;
use App\Models\ActionLog;
use App\Models\Complaint;
use App\Models\ComplaintSubject;
use App\Models\CsvImportRowResult;
use App\Models\Enrollment;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\NonTeachingStaff;
use App\Models\Position;
use App\Models\Program;
use App\Models\Referral;
use App\Models\SchoolYear;
use App\Models\TeachingStaff;
use App\Models\User;
use App\Models\UserPermission;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use ZipArchive;

class AccountController extends Controller
{
    private $id;

    public function index()
    {
        $account = new User;

        return Inertia::render('itrc/accounts',
            array_merge($account->allUserAccount(), [
                'program_name' => is_program_head(),
                'program' => Program::all(['id', 'name']),
                'account_files' => FileController::scopedAccountFiles(),
            ]));
    }

    public function updateUserInformation(Request $request)
    {
        UserPermission::updateOrCreate(
            ['user_id' => $request->user_id],
            self::getUserFields($request)
        );

        return response()->json(['status' => 'User Information Updated Successfully']);
    }

    public function studentListIndex()
    {
        $programHead = TeachingStaff::with('program')
            ->where('user_id', auth()->user()->id)
            ->where('position_id', Position::idFor('program_head'))
            ->first();

        $isPrefect = (auth()->user()->role === 'sub_admin') ? 'prefect' : 'other';

        $schoolYears = SchoolYear::orderByDesc('year')->pluck('year');
        $schoolYearsFull = SchoolYear::orderByDesc('year')->get(['id', 'year']);

        $props = $programHead
                 ? array_merge([
                     'user' => auth()->user(),
                     'students' => [
                         'data' => self::getStudent(),
                     ],
                     'program' => Program::all(['id', 'name']),
                     'program_name' => is_program_head(),
                     'file_name' => "student-{$programHead->program_id}-{$programHead->program->name}.zip",
                     'file_name_faculty' => "faculty-account-{$programHead->program_id}-{$programHead->program->name}.csv",
                     'school_years' => $schoolYears,
                     'school_years_full' => $schoolYearsFull,
                 ])
                 : [
                     'user' => auth()->user(),
                     'students' => [
                         'data' => self::getStudent(),
                     ],
                     'program' => Program::all(['id', 'name', 'description', 'color_code']),
                     'school_years' => $schoolYears,
                     'school_years_full' => $schoolYearsFull,
                 ];

        return Inertia::render("$isPrefect/students", $props);
    }

    /**
     * Super admin only: update one student's enrollment record — the manual
     * counterpart to the bulk CSV path below. Keyed the same way
     * ProcessStudentCsvRow already upserts enrollment (student_id,
     * program_id, school_year_id), so a same-year semester change updates
     * the existing row in place while a new school year or program creates
     * a new history row, matching how User::enrollments()/enrollment() are
     * already modeled.
     */
    public function updateEnrollment(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:users,id',
            'program_id' => 'required|exists:program,id',
            'school_year_id' => 'required|exists:school_year,id',
            'semester' => 'required|integer|between:1,2',
            'year_level' => 'required|integer|between:1,4',
            'enrolled_at' => 'required|date',
        ]);

        $student = User::where('id', $data['student_id'])->where('role', 'student')->firstOrFail();

        $existing = Enrollment::where('student_id', $student->id)
            ->where('program_id', $data['program_id'])
            ->where('school_year_id', $data['school_year_id'])
            ->first();

        Enrollment::updateOrInsert(
            [
                'student_id' => $student->id,
                'program_id' => $data['program_id'],
                'school_year_id' => $data['school_year_id'],
            ],
            [
                'semester' => $data['semester'],
                'year_level' => $data['year_level'],
                'enrolled_at' => $data['enrolled_at'],
                'status' => 'enrolled',
            ]
        );

        $changes = [];
        foreach (['semester', 'year_level', 'enrolled_at'] as $field) {
            $from = $existing?->{$field};
            $to = $data[$field];
            if ((string) $from !== (string) $to) {
                $changes[$field] = ['from' => $from ?? '—', 'to' => $to];
            }
        }

        ActionLog::log(
            auth()->user()->id,
            'update',
            "Updated the enrollment record of student {$student->id_number}",
            $changes
        );

        return response()->json(['message' => 'Enrollment updated successfully.']);
    }

    /** Preview an enrollment-update CSV: parse + validate every row, write nothing. */
    public function previewEnrollmentUpdateCsv(Request $request)
    {
        $request->validate(['file' => 'required|file']);

        $tmpPath = $request->file('file')->getRealPath();
        $rows = get_user_df($tmpPath);

        $preview = [];
        foreach ($rows as $i => $row) {
            $errors = self::validateEnrollmentUpdateCsvRow($row);
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
    public function validateEnrollmentUpdateCsvRowRequest(Request $request)
    {
        $errors = self::validateEnrollmentUpdateCsvRow($request->row ?? []);

        return response()->json(['valid' => empty($errors), 'errors' => $errors]);
    }

    /** Commit the reviewed rows: one queued job per student, batched, with live progress. */
    public function commitEnrollmentUpdateCsv(Request $request)
    {
        $request->validate([
            'rows' => 'required|array|min:1',
        ]);

        $userId = auth()->user()->id;
        $lockKey = "csv-batch-lock:enrollment-update:{$userId}";

        if (Cache::has($lockKey)) {
            return response()->json([
                'status' => 'locked',
                'message' => 'Your previous enrollment-update CSV batch is still being processed. Please wait until it finishes.',
            ], 423);
        }

        $rows = $request->rows;
        $total = count($rows);

        $jobs = [];
        foreach ($rows as $i => $row) {
            $jobs[] = new ProcessEnrollmentUpdateCsvRow($row, $i, $total, $userId);
        }

        $batch = Bus::batch($jobs)
            ->then(function ($batch) use ($userId, $lockKey) {
                $results = CsvImportRowResult::where('batch_id', $batch->id)->get();

                Cache::forget($lockKey);

                try {
                    broadcast(new CsvBatchCompleted($userId, [
                        'batch_id' => $batch->id,
                        'total' => $results->count(),
                        'success_count' => $results->where('status', 'success')->count(),
                        'error_count' => $results->where('status', 'error')->count(),
                        'errors' => $results->where('status', 'error')->map(fn ($r) => [
                            'row_index' => $r->row_index,
                            'id_number' => $r->id_number,
                            'full_name' => $r->full_name,
                            'message' => $r->message,
                        ])->values(),
                    ]));
                } catch (\Throwable $e) {
                    Log::warning('CsvBatchCompleted broadcast failed: '.$e->getMessage());
                }
            })
            ->finally(function ($batch) use ($lockKey) {
                Cache::forget($lockKey);
            })
            ->name('enrollment-update-csv-'.now()->timestamp)
            ->dispatch();

        Cache::put($lockKey, $batch->id, now()->addHours(2));

        ActionLog::create([
            'user_id' => $userId,
            'action_type' => 'update',
            'details' => 'uploads an enrollment-update csv file',
        ]);

        return response()->json(['batch_id' => $batch->id]);
    }

    public static function validateEnrollmentUpdateCsvRow(array $row): array
    {
        $errors = [];
        $required = ['id', 'program', 'year_level', 'enrolled_at'];

        foreach ($required as $col) {
            if (! isset($row[$col]) || trim((string) $row[$col]) === '') {
                $errors[] = "'$col' cannot be empty.";
            }
        }

        if (empty($errors)) {
            if (! preg_match('/^[Cc]\d+$/', $row['id'])) {
                $errors[] = "Invalid ID format. Must start with 'C' followed by digits (e.g. C2210213).";
            } elseif (! User::where('id_number', strtolower($row['id']))->where('role', 'student')->exists()) {
                $errors[] = "No existing student found with ID '{$row['id']}'.";
            }
            if (! Program::whereRaw('LOWER(name) = ?', [strtolower(trim($row['program']))])->exists()) {
                $errors[] = 'Program must match an existing program name (e.g. BSIT, BEED, BSN).';
            }
            if (! is_numeric($row['year_level']) || $row['year_level'] < 1 || $row['year_level'] > 4) {
                $errors[] = 'Year level must be 1–4.';
            }
            if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $row['enrolled_at']) || ! strtotime($row['enrolled_at'])) {
                $errors[] = 'enrolled_at must be a valid date in YYYY-MM-DD format.';
            }
        }

        return $errors;
    }

    public function facultyListIndex()
    {
        $isPrefect = (auth()->user()->role === 'sub_admin') ? 'prefect' : 'other';
        $programHead = TeachingStaff::with('program')
            ->where('user_id', auth()->user()->id)
            ->where('position_id', Position::idFor('program_head'))
            ->first();

        $props = $programHead
                 ? array_merge([
                     'user' => auth()->user(),
                     'faculty' => self::getFaculty(),
                     'program_name' => is_program_head(),
                     'file_name' => "faculty-account-{$programHead->program_id}-{$programHead->program->name}.csv",
                 ])
                 : [
                     'user' => auth()->user(),
                     'faculty' => self::getFaculty(),
                     'program_name' => is_program_head(),
                     'program' => Program::all(['id', 'name']),
                 ];

        return Inertia::render("$isPrefect/faculty", $props);
    }

    /**
     * Prefect only: a roster covering both staff roles, split by tab —
     * unlike getFaculty() (teaching_staff only, program-scoped for program
     * heads), this is unscoped and lets the caller pick teaching vs.
     * non-teaching via ?type=.
     */
    public function getStaffList()
    {
        $type = $_GET['type'] ?? 'teaching';
        $roles = match ($type) {
            'non_teaching' => ['non_teaching_staff'],
            'all' => ['teaching_staff', 'non_teaching_staff'],
            default => ['teaching_staff'],
        };

        $data = User::with(['profile', 'teachingStaff.program', 'nonTeachingStaff'])
            ->whereIn('role', $roles);

        // Program only makes sense for teaching staff — non-teaching staff
        // aren't attached to a program at all, and "All Staff" mixes both
        // together so a single program can't scope the whole list.
        if ($type === 'teaching' && isset($_GET['program']) && $_GET['program'] !== 'all') {
            $data->whereHas('teachingStaff', function ($q) {
                $q->where('program_id', $_GET['program']);
            });
        }

        // Position applies to both staff types (teachingStaff and
        // nonTeachingStaff both reference the same positions table) — under
        // "All Staff" a row only ever has one of the two relations, so this
        // matches whichever one it actually has.
        if (isset($_GET['position']) && $_GET['position'] !== 'all') {
            if ($type === 'non_teaching') {
                $data->whereHas('nonTeachingStaff', function ($q) {
                    $q->where('position_id', $_GET['position']);
                });
            } elseif ($type === 'all') {
                $data->where(function ($q) {
                    $q->whereHas('teachingStaff', fn ($sq) => $sq->where('position_id', $_GET['position']))
                        ->orWhereHas('nonTeachingStaff', fn ($sq) => $sq->where('position_id', $_GET['position']));
                });
            }
        }

        if (isset($_GET['search']) && $_GET['search'] !== '') {
            $data->where('id_number', 'like', "%{$_GET['search']}%");
        }

        return UserResource::collection(
            $data->latest('created_at')
                ->paginate(100)
                ->appends([
                    'search' => $_GET['search'] ?? '',
                    'type' => $_GET['type'] ?? 'teaching',
                    'program' => $_GET['program'] ?? 'all',
                    'position' => $_GET['position'] ?? 'all',
                ])
        );
    }

    public function staffListIndex()
    {
        return Inertia::render('prefect/staff-list', [
            'user' => auth()->user(),
            'staff' => self::getStaffList(),
            'programs' => Program::all(['id', 'name']),
            'positions' => Position::orderBy('name')->get(),
        ]);
    }

    public function parentListIndex()
    {
        return Inertia::render('prefect/parent-list', [
            'user' => auth()->user(),
            'parents' => self::getParentList(),
        ]);
    }

    /**
     * Prefect's "User List" — the old sidebar had Student/Staff/Parent as
     * three separate dropdown items (three full page loads); this collapses
     * them into one page with tabs, so it only builds the props the active
     * tab actually needs (`getStudent()`/`getStaffList()`/`getParentList()`
     * already read every filter straight from $_GET, so reusing them here
     * needs no changes to those methods).
     */
    public function userListIndex()
    {
        $tab = request('tab', 'student');

        $props = [
            'user' => auth()->user(),
            'tab' => $tab,
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
            'school_years_full' => SchoolYear::orderByDesc('year')->get(['id', 'year']),
        ];

        switch ($tab) {
            case 'staff':
                $props['staff'] = self::getStaffList();
                $props['programs'] = Program::all(['id', 'name']);
                $props['positions'] = Position::orderBy('name')->get();
                break;
            case 'parent':
                $props['parents'] = self::getParentList();
                break;
            default:
                $props['students'] = ['data' => self::getStudent()];
                $props['program'] = Program::all(['id', 'name', 'description', 'color_code']);
                break;
        }

        return Inertia::render('prefect/user-list', $props);
    }

    public function getParentList()
    {
        $data = User::with(['profile', 'parent'])->where('role', 'parent');

        if (isset($_GET['search']) && $_GET['search'] !== '') {
            $data->where('id_number', 'like', "%{$_GET['search']}%");
        }

        return UserResource::collection(
            $data->latest('created_at')
                ->paginate(100)
                ->appends(['search' => $_GET['search'] ?? ''])
        );
    }

    /**
     * Super admin only: manage the list of assignable non-teaching-staff
     * positions itself (see positionStore/updatePosition/destroyPosition
     * below) — this used to be a fixed 8-entry const here, now backed by
     * the `positions` table so an admin can add/rename/remove options
     * without a code change. Both non_teaching_staff and teaching_staff
     * reference this table via position_id, so renaming a position here
     * updates every staff member already assigned it (unlike the old
     * fixed-string setup).
     */
    public function positionIndex()
    {
        return response()->json(Position::orderBy('name')->get());
    }

    public function positionStore(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:191|unique:positions,name',
        ]);

        Position::create($data);

        return Position::orderBy('name')->get();
    }

    /**
     * "Guard"/"Guidance"/"IT Staff" (gate pass verification routing,
     * referral intake/forwarding — see NonTeachingStaff-position checks in
     * DashboardController, GatePassController, ReferralController,
     * sidebar-pages.js) and "faculty"/"program_head" (the whole
     * teaching_staff role hierarchy — is_program_head(),
     * Program::programHead(), dashboard/report routing) are load-bearing:
     * renaming or deleting any of them would silently break the feature
     * that keys off that exact string. Every other position is a
     * free-form label with no such dependency.
     */
    private const PROTECTED_POSITIONS = ['Guard', 'Guidance', 'IT Staff', 'faculty', 'program_head'];

    public function updatePosition(Request $request)
    {
        $position = Position::findOrFail($request->id);

        if (in_array($position->name, self::PROTECTED_POSITIONS, true)) {
            return response()->json([
                'message' => "{$position->name} cannot be renamed — this position has other access in the system.",
            ], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:191|unique:positions,name,'.$position->id,
        ]);

        $position->update($data);

        return Position::orderBy('name')->get();
    }

    public function destroyPosition(Request $request)
    {
        $position = Position::findOrFail($request->id);

        if (in_array($position->name, self::PROTECTED_POSITIONS, true)) {
            return response()->json([
                'message' => "{$position->name} cannot be deleted — this position has other access in the system.",
            ], 403);
        }

        if (NonTeachingStaff::where('position_id', $position->id)->exists()) {
            return response()->json([
                'message' => "{$position->name} cannot be deleted — staff are still assigned to it.",
            ], 409);
        }

        $position->delete();

        return Position::orderBy('name')->get();
    }

    /**
     * Super admin only: assign (or reassign) a non-teaching staff member's
     * position from the managed list above — this is the only place a
     * non_teaching_staff account ever gets a position, since registration
     * doesn't collect one.
     */
    // 'faculty'/'program_head' live in the same `positions` table (so
    // teaching_staff.position_id and non_teaching_staff.position_id share
    // one foreign key target) but are teaching_staff-only — never
    // assignable to a non-teaching-staff account.
    private const TEACHING_ONLY_POSITIONS = ['faculty', 'program_head'];

    public function assignStaffPosition(Request $request)
    {
        $assignable = Position::whereNotIn('name', self::TEACHING_ONLY_POSITIONS)->pluck('name');

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'position' => 'required|in:'.$assignable->implode(','),
        ]);

        $user = User::where('id', $request->user_id)->where('role', 'non_teaching_staff')->first();

        if (! $user) {
            return response()->json(['message' => 'This account is not a non-teaching staff account.'], 400);
        }

        NonTeachingStaff::updateOrCreate(
            ['user_id' => $user->id],
            ['position_id' => Position::idFor($request->position)]
        );

        return response()->json(['message' => 'Position Assigned Successfully']);
    }

    /**
     * Super admin only: clear a non-teaching staff member's position.
     * Guard/Guidance are excluded — removing them would silently strip the
     * gate pass verification / referral intake access those two positions
     * carry (see GatePassController::qrcodeIndex(), ReferralController).
     */
    public function removeStaffPosition(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $staff = NonTeachingStaff::where('user_id', $request->user_id)->first();

        if (! $staff) {
            return response()->json(['message' => 'This staff member has no position assigned.'], 404);
        }

        if (in_array($staff->position, self::PROTECTED_POSITIONS, true)) {
            return response()->json([
                'message' => "{$staff->position} cannot be removed — this position has other access in the system.",
            ], 403);
        }

        $staff->delete();

        return response()->json(['message' => 'Position Removed Successfully']);
    }

    /**
     * Program heads only: students, faculty, and their default account
     * files, all scoped to their own program.
     */
    public function programAccountFilesIndex()
    {
        $programHead = TeachingStaff::with('program')
            ->where('user_id', auth()->user()->id)
            ->where('position_id', Position::idFor('program_head'))
            ->first();

        if (! $programHead) {
            abort(403);
        }

        return Inertia::render('other/program-account-files', [
            'user' => auth()->user(),
            'program_name' => is_program_head(),
            'students' => ['data' => self::getStudent()],
            'faculty' => self::getFaculty(),
            'account_files' => FileController::scopedAccountFiles(),
        ]);
    }

    public function childrenListIndex()
    {
        $familyId = FamilyMember::where('member_id', auth()->user()->id)->value('family_id');

        return Inertia::render('parent/children-monitoring', [
            'user' => auth()->user(),
            'children' => UserResource::collection(User::with(['profile', 'program', 'enrollments'])
                ->whereIn('id', FamilyMember::where('family_id', $familyId)->pluck('member_id'))
                ->where('role', 'student')
                ->get()),
        ]);
    }

    public function userRequestMonitoring()
    {
        return Inertia::render('itrc/user-request-monitoring', [
            'user' => auth()->user(),
        ]);
    }

    public function accountSettingsIndex($id)
    {
        $props = [
            'user' => auth()->user(),
            'program_name' => is_program_head(),
            'otherUserAccount' => new UserResource(User::with('profile')->where('username', $id)->first()),
        ];

        return Inertia::render('itrc/account-settings', $props);
    }

    public function update(UpdateAccountRequest $request)
    {
        // This endpoint only ever updates the authenticated user's own account —
        // never trust an id from the request for the target row (that was the
        // account-takeover bug: a client-supplied user_id let anyone overwrite
        // anyone else's credentials).
        $user = auth()->user();

        // During forced first-login setup, the password is saved together
        // with the profile by AccountSetupController::complete() — this
        // endpoint must not persist a password change on its own until that
        // combined step happens, even if hit directly.
        if (session('force_account_setup')) {
            return response()->json([
                'error' => 'Complete account setup (profile and password together) before changing your password here.',
            ], 422);
        }

        // Only touch the fields actually present in this request — a
        // password-only submission (or a username/email-only one) must not
        // blank out the fields it wasn't given.
        $fields = [];

        if ($request->filled('username')) {
            $fields['username'] = strtolower($request->username);
        }

        if ($request->filled('email')) {
            $fields['email'] = strtolower($request->email);
        }

        // ============================================================
        // 🔹 PASSWORD CHANGE CHECK
        // ============================================================
        $wantsPasswordChange = $request->password || $request->password_confirmation;

        // ============================================================
        // 🔹 If password change is requested
        // ============================================================
        if ($wantsPasswordChange) {
            if (! Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'error' => 'Current password is incorrect',
                ], 422);
            }

            // Add new password to update array
            $fields['password'] = Hash::make($request->password);

            if (! $user->already_update_password) {
                $fields['already_update_password'] = true;
            }
        }

        // ============================================================
        // 🔹 Perform Update
        // ============================================================
        $originalUsername = $user->username;
        $originalEmail = $user->email;

        if (! empty($fields)) {
            $user->update($fields);
        }

        // ============================================================
        // 🔹 Log Action
        // ============================================================
        $changes = [];
        if (isset($fields['username']) && $originalUsername !== $fields['username']) {
            $changes['username'] = ['from' => $originalUsername, 'to' => $fields['username']];
        }
        if (isset($fields['email']) && $originalEmail !== $fields['email']) {
            $changes['email'] = ['from' => $originalEmail, 'to' => $fields['email']];
        }
        // Never log the actual password/hash — just note that it changed.
        if ($wantsPasswordChange) {
            $changes['password'] = ['from' => '••••••••', 'to' => '••••••••'];
        }

        ActionLog::log($user->id, 'account_update', 'Updated user account credentials', $changes);

        // Return updated fields (excluding password)
        return response()->json([
            'success' => true,
            'data' => $user->only(['email', 'username']),
        ]);
    }

    public function checkCurrentPassword($value, $id)
    {
        $user = auth()->user();

        if (! $user || (int) $id !== $user->id) {
            return response()->json(false);
        }

        return response()->json(Hash::check($value, $user->password));
    }

    public function uploadUpdateStudent(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv',
            'school_year' => 'string|required',
        ]);

        $path = storage_path('app/private/zips/student_dataset.csv');

        try {
            if (File::exists($path)) {
                return response()->json([
                    'status' => 'locked',
                    'message' => 'Your previous CSV is still being processed. Please wait until it finishes.',
                ], 423);
            }
            File::delete($path);
            File::put($path, request()->file('file')->getContent());

            ProcessStudentAccountUpdate::dispatch($path, $request->school_year);
            ActionLog::create([
                'user_id' => auth()->user()->id,
                'action_type' => 'update',
                'details' => 'uploads a currently enrolled students csv file for automatic student account generation',
            ]);

            return response()->json([
                'message' => 'Successfully processed all students.',
            ]);
        } catch (Exception $x) {
            File::delete($path);

            return response()->json([
                'message' => 'There was an error.',
            ], 400);
        }
    }

    public function searchAccount($username)
    {
        $account = new User;

        return response()->json([$account->findAccountContactDetail($username)]);
    }

    public function accountSettings()
    {
        return Inertia::render('other/account-settings', [
            'user' => auth()->user(),
        ]);
    }

    public function toggle($username, Request $request)
    {
        if ($username == 'all-users') {
            $account = new User;
            User::whereIn('id', $request->ids)
                ->update(['activate' => $request->status]);

            return response()->json($account->allUserAccount());
        } else {
            User::where('username', $username)
                ->update(['activate' => $request->status]);
        }
    }

    public function setActivityStatus(Request $request)
    {
        auth()->user()->update(['activate' => $request->status]);
    }

    public function destroy(Request $request)
    {
        $userIds = [];

        // Allow single or multiple delete input
        if ($request->has('user_ids')) {
            $userIds = $request->user_ids;
        } elseif ($request->has('user_id')) {
            $userIds = [$request->user_id];
        } else {
            return response()->json(['message' => 'No user selected for deletion.'], 400);
        }

        $deleted = [];
        $skipped = [];
        $notFound = [];

        foreach ($userIds as $userId) {

            $user = User::where('id', $userId)->first();

            if (! $user) {
                $notFound[] = $userId;

                continue;
            }

            $role = $user->role;

            // 🔒 Guard/Guidance/IT Staff hold access other roles depend on (gate
            // pass verification, referral intake/forwarding) — deleting the
            // account would silently strip that, so it's blocked the same as
            // the position itself (see removeStaffPosition()).
            if ($role === 'non_teaching_staff') {
                // ->value('position') would hit the raw column directly, which
                // no longer exists — first() hydrates the model so the
                // position_id-backed accessor runs instead.
                $position = NonTeachingStaff::where('user_id', $userId)->first()?->position;
                if (in_array($position, self::PROTECTED_POSITIONS, true)) {
                    $skipped[] = [
                        'user_id' => $userId,
                        'reason' => "{$position} accounts cannot be deleted — they have other access in the system.",
                    ];

                    continue;
                }
            }

            // 🔶 super_admin / sub_admin — must leave at least 1 remaining
            if (in_array($role, ['super_admin', 'sub_admin'])) {
                $count = User::where('role', $role)->count();

                if ($count <= 1) {
                    $skipped[] = [
                        'user_id' => $userId,
                        'reason' => "At least two {$role} accounts are required.",
                    ];

                    continue;
                }
            }

            DB::beginTransaction();
            try {

                // ❌ Check linked data (complaints / referrals)
                $hasComplaint = Complaint::where('complainant_id', $userId)
                    ->orWhereHas('complaintSubject', fn ($q) => $q->where('student_id', $userId))
                    ->exists();

                $hasReferral = Referral::where('teaching_staff_id', $userId)
                    ->orWhereHas('referralReferredStudent', fn ($q) => $q->where('student_id', $userId))
                    ->exists();

                if ($hasComplaint || $hasReferral) {
                    DB::rollBack();
                    $skipped[] = [
                        'user_id' => $userId,
                        'reason' => 'User has linked complaints or referrals.',
                    ];

                    continue;
                }

                // 🔶 Parent logic
                $deleteFamily = false;
                $familyId = null;
                if ($role === 'parent') {

                    $familyMember = FamilyMember::where('member_id', $userId)->first();

                    if ($familyMember) {
                        $familyId = $familyMember->family_id;

                        $parentCount = User::whereIn('id', FamilyMember::where('family_id', $familyId)->pluck('member_id'))
                            ->where('role', 'parent')
                            ->count();

                        $deleteFamily = ($parentCount == 1);
                    }
                }

                // 🖼 Delete Profile Picture
                if ($user->profile?->profile_picture) {
                    Storage::disk('public')->delete("profile-pictures/{$user->profile->profile_picture}");
                }

                // 🧩 Remove user from CSV
                $this->removeUserFromFile($user);

                // 🗑 Delete user
                $user->delete();

                if ($deleteFamily && $familyId) {
                    Family::where('id', $familyId)->delete();
                    FamilyMember::where('family_id', $familyId)->delete();
                }

                DB::commit();
                $deleted[] = $userId;

            } catch (Exception $e) {
                DB::rollBack();
                $skipped[] = [
                    'user_id' => $userId,
                    'reason' => 'Internal error: '.$e->getMessage(),
                ];
            }
        }

        // 🔥 FINAL RESPONSE HANDLER
        if (! empty($skipped) || ! empty($notFound)) {
            return response()->json([
                'message' => 'Some users could not be deleted.',
                'deleted_users' => $deleted,
                'skipped_users' => $skipped,
                'not_found_users' => $notFound,
            ], 400); // 🚨 ERROR STATUS CODE
        }

        // 🟢 FULL SUCCESS
        return response()->json([
            'message' => 'All selected users were successfully deleted.',
            'deleted_users' => $deleted,
        ], 200);
    }

    private function setId($s)
    {
        $this->id = $s;
    }

    public function removeUserFromFile($user)
    {
        if ($user->role === 'student') {
            Log::info('student');

            return self::removeStudentFromZip($user);
        }

        if (in_array($user->role, ['teaching_staff', 'non_teaching_staff'])) {
            Log::info('teaching or non-teaching staff');

            return self::removeEmployeeFromCsv($user);
        }

        return false;
    }

    /**
     * Remove a student from their program ZIP and year CSV.
     */
    protected function removeStudentFromZip($user)
    {
        $user->loadMissing('enrollments.program');
        $enrollment = $user->enrollments->sortByDesc('id')->first();

        if (! $enrollment || ! $enrollment->program) {
            return false;
        }

        $program = $enrollment->program;
        $zipName = "student-{$program->id}-{$program->name}.zip";
        $zipPath = storage_path("app/private/zips/{$zipName}");
        $csvName = "student-account-{$program->id}-{$program->name}-year-{$enrollment->year_level}.csv";

        if (! file_exists($zipPath)) {
            return false;
        }

        $zip = new ZipArchive;
        $tmpExtractPath = storage_path('app/tmp_zip_read/student_delete');

        // Reset temp folder
        if (File::exists($tmpExtractPath)) {
            File::deleteDirectory($tmpExtractPath);
        }
        File::makeDirectory($tmpExtractPath, 0755, true);

        if ($zip->open($zipPath) === true) {
            if ($zip->locateName($csvName) !== false) {
                $zip->extractTo($tmpExtractPath, [$csvName]);
                $csvPath = "{$tmpExtractPath}/{$csvName}";

                if (file_exists($csvPath)) {
                    $fileRows = array_map('str_getcsv', file($csvPath));
                    $header = array_shift($fileRows);

                    // Filter out the user row
                    $filteredRows = array_filter($fileRows, function ($row) use ($user) {
                        return strtolower(trim($row[0])) !== strtolower($user->id_number ?? '');
                    });

                    // Rewrite CSV
                    $fp = fopen($csvPath, 'w');
                    fputcsv($fp, $header);
                    foreach ($filteredRows as $r) {
                        fputcsv($fp, $r);
                    }
                    fclose($fp);

                    // Replace CSV inside ZIP
                    $zip->deleteName($csvName);
                    $zip->addFile($csvPath, $csvName);
                }
            }
            $zip->close();
        }

        File::deleteDirectory($tmpExtractPath);

        return true;
    }

    /**
     * Remove faculty or staff from their CSV.
     */
    protected function removeEmployeeFromCsv($user)
    {
        try {
            $programId = null;
            $programName = null;

            // ✅ Get teaching-staff program if applicable
            if ($user->role === 'teaching_staff') {
                $teachingStaff = $user->teachingStaff()->with('program')->first();

                // 🩹 Safely access related program
                if ($teachingStaff && $teachingStaff->program) {
                    $programId = $teachingStaff->program->id;
                    $programName = Str::slug($teachingStaff->program->name, '-');
                } else {
                    Log::warning("Teaching staff {$user->id_number} has no program relationship.");

                    return false;
                }
            }

            // ✅ Build CSV path safely
            $csvPath = match ($user->role) {
                'teaching_staff' => storage_path("app/private/zips/faculty-account-{$programId}-{$programName}.csv"),
                'non_teaching_staff' => storage_path('app/private/zips/staff-account.csv'),
                default => null,
            };

            if (! $csvPath || ! file_exists($csvPath)) {
                Log::warning("CSV file missing for {$user->id_number}: {$csvPath}");

                return false;
            }

            // ✅ Read the CSV file
            $fileRows = array_map('str_getcsv', file($csvPath));
            if (empty($fileRows)) {
                return false;
            }

            $header = array_shift($fileRows);

            // ✅ Filter out deleted user
            $filteredRows = array_filter($fileRows, fn ($r) => strtolower(trim($r[0])) !== strtolower($user->id_number ?? '')
            );

            // ✅ Write updated data to a temporary file first
            $tempPath = $csvPath.'.tmp';
            $fp = fopen($tempPath, 'w');
            fputcsv($fp, $header);
            foreach ($filteredRows as $r) {
                fputcsv($fp, $r);
            }
            fclose($fp);

            // ✅ Replace old CSV atomically
            if (file_exists($tempPath)) {
                rename($tempPath, $csvPath);
            }

            return true;
        } catch (Exception $e) {
            Log::error('removeEmployeeFromCsv failed: '.$e->getMessage());
            if (isset($tempPath) && file_exists($tempPath)) {
                @unlink($tempPath);
            }
            throw $e; // Let parent rollback DB transaction
        }
    }

    public function getAllUser($l)
    {
        $account = new User;

        return $account->allUserAccount();
    }

    public function getContact($username)
    {
        $user = User::with('profile')
            ->where(function ($q) use ($username) {
                $q->where('username', $username)->orWhere('id_number', $username);
            })
            ->first();

        if (! $user) {
            return response()->json(['message' => "This Account Doesn't Exists."], 400);
        }

        if (empty($user->email) && empty($user->profile?->contact_number)) {
            return response()->json(['message' => "This Account Doesn't Have Email."], 400);
        }

        return response()->json([
            'email' => $user->email ?: null,
            'contact_number' => $user->profile?->contact_number ?: null,
        ]);
    }

    public function getFaculty()
    {
        $myTeachingStaff = TeachingStaff::where('user_id', auth()->user()->id)->first();
        $isProgramHead = $myTeachingStaff && $myTeachingStaff->position === 'program_head';

        $data = User::with(['profile', 'teachingStaff.program'])
            ->where('role', 'teaching_staff');

        if (in_array(auth()->user()->role, ['super_admin', 'sub_admin']) || $isProgramHead) {
            // Filter by program if not "all"
            if (isset($_GET['program']) && $_GET['program'] != 'all') {
                $data->whereHas('teachingStaff', function ($q) {
                    $q->where('program_id', $_GET['program']);
                });
            }

            // Apply search filter if present
            if (isset($_GET['search']) && $_GET['search'] !== '') {
                $data = $data->where('id_number', 'like', "%{$_GET['search']}%")
                    ->latest('created_at')
                    ->paginate(100)
                    ->appends([
                        'search' => $_GET['search'],
                    ]);
            } else {
                $programIds = $isProgramHead ? $myTeachingStaff->programsHandled->pluck('id') : collect();

                $data = $programIds->isEmpty()
                        ?
                        $data->latest('created_at')
                            ->paginate(100)
                            ->appends([
                                'program' => $_GET['program'] ?? 'all',
                            ])
                        :
                        $data->latest('created_at')
                            ->whereHas('teachingStaff', function ($q) use ($programIds) {
                                $q->whereIn('program_id', $programIds);
                            })
                            ->paginate(100)
                            ->appends([
                                'program' => $_GET['program'] ?? 'all',
                            ]);
            }

            return UserResource::collection($data);
        } else {
            $programId = $myTeachingStaff?->program_id;

            self::setId($programId);

            return TeachingStaffResource::collection(TeachingStaff::with(['program', 'user.profile'])
                ->where('program_id', self::getId())
                ->paginate(10));
        }
    }

    public function getStudent()
    {
        $myTeachingStaff = auth()->user()->role === 'teaching_staff'
                         ? TeachingStaff::where('user_id', auth()->user()->id)->first()
                         : null;
        $isProgramHead = $myTeachingStaff && $myTeachingStaff->position === 'program_head';

        $data = User::with(['profile', 'program', 'enrollments.schoolYear'])
            ->where('role', 'student')
            ->whereHas('enrollments', function ($q) {
                $q->where('status', 'enrolled');
            });

        if (in_array(auth()->user()->role, ['sub_admin', 'super_admin']) || $isProgramHead) {
            // Filter by program if not "all"
            if (isset($_GET['program']) && $_GET['program'] != 'all') {
                $data->whereHas('enrollments', function ($q) {
                    $q->where('program_id', $_GET['program']);
                });
            }

            // Filter by year level if not "all"
            if (isset($_GET['school-year']) && $_GET['school-year'] != 'all') {
                $data->whereHas('enrollments', function ($q) {
                    $q->whereHas('schoolYear', function ($sq) {
                        $sq->where('year', $_GET['school-year']);
                    });
                });
            }

            // Filter by semester if not "all"
            if (isset($_GET['semester']) && $_GET['semester'] != 'all') {
                $data->whereHas('enrollments', function ($q) {
                    $q->where('semester', $_GET['semester']);
                });
            }

            // Apply search filter if present
            if (isset($_GET['search']) && $_GET['search'] !== '') {
                $data = $data->where('id_number', 'like', "%{$_GET['search']}%")
                    ->latest('created_at')
                    ->get();
            } else {
                $programIds = $isProgramHead ? $myTeachingStaff->programsHandled->pluck('id') : collect();

                $data = $programIds->isEmpty()
                        ?
                        $data->latest('created_at')->get()
                        :
                        $data->latest('created_at')
                            ->whereHas('enrollments', function ($q) use ($programIds) {
                                $q->whereIn('program_id', $programIds);
                            })
                            ->get();
            }

            return UserResource::collection($data);
        } else {
            $programId = $myTeachingStaff?->program_id;

            self::setId($programId);

            $data = User::with(['profile', 'program', 'enrollments'])
                ->where('role', 'student')
                ->where('id', '!=', auth()->user()->id);

            if (self::getId()) {
                $data->whereHas('enrollments', function ($q) {
                    $q->where('program_id', self::getId());
                });
            }

            if (request()->has('year-level') && request('year-level') !== 'all') {
                $data->whereHas('enrollments', function ($q) {
                    $q->where('year_level', request('year-level'));
                });
            }

            return UserResource::collection($data->get());
        }
    }

    public function getUsers($type)
    {
        $data = null;
        $search = $_GET['search'];
        $dateRegistered = array_key_exists('date_registered', $_GET) ? $_GET['date_registered'] : null;
        $user = new User;
        $authId = auth()->user()->id;

        switch ($type) {
            case 'student':
                $myTeachingStaff = TeachingStaff::where('user_id', $authId)->first();
                $hasId = $myTeachingStaff?->program_id ?? '';

                $data = User::with(['profile', 'program'])
                    ->where('role', 'student')
                    ->where('id', '!=', $authId);

                // if user has a program, filter students by it
                /*if ($hasId && !str_contains($_SERVER['REQUEST_URI'], '/complai')) {
                    $data->whereHas('enrollments', function ($q) use ($hasId) {
                        $q->where('program_id', $hasId);
                    });
                }else {
                    $data = $data;
                }*/

                break;
            case 'program_student':
                $myTeachingStaff = TeachingStaff::where('user_id', $authId)->first();
                $hasId = $myTeachingStaff?->program_id;

                $data = User::with(['profile', 'program'])
                    ->where('role', 'student')
                    ->where('id', '!=', $authId);

                if ($hasId) {
                    $data->whereHas('enrollments', function ($q) use ($hasId) {
                        $q->where('program_id', $hasId);
                    });
                } else {
                    $data = $data;
                }
                break;
            case 'faculty':
                $myTeachingStaff = TeachingStaff::where('user_id', $authId)->first();
                $isProgramHead = $myTeachingStaff && $myTeachingStaff->position === 'program_head';

                $data = (! $isProgramHead)
                        ?
                        $user->with(['profile', 'teachingStaff.program'])
                            ->where('role', 'teaching_staff')
                            ->where('id', '!=', $authId)
                        :
                        $user->with(['profile', 'teachingStaff.program'])
                            ->where('role', 'teaching_staff')
                            ->whereHas('teachingStaff', function ($q) use ($myTeachingStaff) {
                                $q->where('program_id', $myTeachingStaff->program_id);
                            })
                            ->where('id', '!=', $authId);
                break;
            case 'student_parent':
                $data = $user->whereIn('role', ['student', 'parent'])
                    ->with(['profile', 'program', 'parent.profile']);
                break;
            case 'resolved_student_complaint':
                $data = $user->with(['profile', 'program', 'complaintSubject' => function ($q) {
                    $q->where('complaint_status', 'resolved');
                }])
                    ->whereHas('complaintSubject', function ($q) {
                        $q->where('complaint_status', 'resolved');
                    });
                break;
            case 'all':
                $data = $user->with(['profile', 'program', 'teachingStaff.program', 'parent'])
                    ->where('id', '!=', $authId);
                break;
            case 'all-2':
                $data = $user->with(['profile', 'program', 'teachingStaff.program', 'parent']);
                break;
            case 'family':
                $data = Family::where('family_code', 'like', "%$search%")->limit(5)->get()->map(function ($d) {
                    return [
                        'id' => $d->id,
                        'family_name' => $d->family_code.'-'.$d->family_name,
                    ];
                });
                break;
            case 'family-student':
                $data = $user->whereNotIn('id', FamilyMember::pluck('member_id'))
                    ->with(['profile', 'program'])
                    ->where('role', 'student')
                    ->where('id', '!=', $authId);
                break;
        }
        if ($type != 'family') {
            if (! empty($search)) {
                $data = $data->where(function ($query) use ($search) {
                    $query->whereHas('profile', function ($q) use ($search) {
                        $search = trim($search);

                        // Split by spaces to handle multi-word searches (e.g. "John Doe")
                        $parts = explode(' ', $search);

                        // Single word (e.g. "John")
                        if (count($parts) === 1) {
                            $q->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        }
                        // Two words (e.g. "John Doe" or "Doe John")
                        elseif (count($parts) === 2) {
                            [$first, $second] = $parts;

                            $q->where(function ($sub) use ($first, $second) {
                                $sub->where(DB::raw("CONCAT(first_name, ' ', last_name)"), 'like', "%{$first} {$second}%")
                                    ->orWhere(DB::raw("CONCAT(last_name, ' ', first_name)"), 'like', "%{$first} {$second}%");
                            });
                        }
                        // Three or more words (e.g. "John A. Doe")
                        else {
                            $q->where(DB::raw("CONCAT(first_name, ' ', middle_name, ' ', last_name)"), 'like', "%{$search}%")
                                ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'like', "%{$search}%");
                        }
                    });
                    $query->orWhere('id_number', 'like', "%{$search}%");
                });

                $data = $data->limit(5)->get();
            }if (! empty($dateRegistered)) {
                $data = $data->where(DB::raw("DATE_FORMAT(created_at, '%Y-%m-%d')"), $dateRegistered)
                    ->latest('created_at')
                    ->get();
            }

        }

        return $data;
    }

    public function getStudentParent()
    {
        return UserResource::collection(User::whereIn('role', ['student', 'parent'])
            ->with(['program', 'parent'])
            ->get());
    }

    public function searchAllUsers(Request $request, string $type)
    {
        $search = trim($request->query('search', ''));

        $query = User::with(['profile', 'program', 'enrollments', 'parent', 'teachingStaff.program', 'nonTeachingStaff'])->where('id', '!=', auth()->id());

        switch ($type) {
            case 'faculty':
                $query->where('role', 'teaching_staff');
                break;
            case 'non-teaching-staff':
                // Prefect's Staff List "Non-Teaching Staff" tab — the
                // counterpart to 'faculty' (teaching_staff only).
                $query->where('role', 'non_teaching_staff');
                break;
            case 'student':
                // Used to pick a target student for complaint/referral/call-in
                // — must be a currently enrolled, activated account, not just
                // any row with role='student'.
                $query->where('role', 'student')
                    ->where('activate', true)
                    ->whereHas('enrollment');
                break;
            case 'family-student':
                $query->where('role', 'student');
                break;
            case 'archive-student':
                // Archived records span students regardless of their
                // CURRENT status — unlike the 'student' case above, a
                // graduated/deactivated student must still be findable here.
                $query->where('role', 'student');
                break;
            case 'program_student':
                $query->where('role', 'student');
                $myTeachingStaff = auth()->user()->role === 'teaching_staff'
                    ? TeachingStaff::where('user_id', auth()->id())->first()
                    : null;
                $programIds = $myTeachingStaff?->position === 'program_head'
                    ? $myTeachingStaff->programsHandled->pluck('id')
                    : collect($myTeachingStaff?->program_id ? [$myTeachingStaff->program_id] : []);
                if ($programIds->isNotEmpty()) {
                    $query->whereHas('enrollments', function ($q) use ($programIds) {
                        $q->whereIn('program_id', $programIds);
                    });
                }
                break;
            case 'student_parent':
                // Used to pick an appointment recipient — parents aren't
                // subject to enrollment, but a student result must still be
                // a currently enrolled, activated account.
                $query->where(function ($q) {
                    $q->where(function ($q2) {
                        $q2->where('role', 'student')
                            ->where('activate', true)
                            ->whereHas('enrollment');
                    })->orWhere('role', 'parent');
                });
                break;
            case 'resolved_student_complaint':
                $studentIds = ComplaintSubject::whereHas('complaint', function ($q) {
                    $q->where('complaint_status', 'resolved');
                })->pluck('student_id');
                $query->where('role', 'student')->whereIn('id', $studentIds);
                break;
            case 'all-2':
                break;
            default:
                abort(404);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('id_number', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhereHas('profile', function ($p) use ($search) {
                        $p->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        return UserSearchResource::collection(
            $query->latest('users.created_at')->limit(10)->get()
        );
    }

    private function getId()
    {
        return $this->id;
    }

    private function getUserFields($request)
    {
        return [
            'allow_complaint' => $request->allow_complaint,
            'allow_referral' => $request->allow_referral,
            'allow_absent_form' => $request->allow_absent_form,
            'allow_appointment' => $request->allow_appointment,
            'allow_gatepass' => $request->allow_gatepass,
        ];
    }

    public function validateUser($type, $value, $id = null)
    {
        $authUserId = auth()->check()
                      ?
                      auth()->user()->id
                      :
                      null;

        // Find any user with same username/email except the one being edited
        $exists = auth()->check()
                  ?
                  User::where($type, $value)
                      ->when($id, function ($q) use ($id) {
                          $q->where('id', '!=', $id); // exclude user being edited
                      })
                      ->exists()
                  :
                  User::where($type, $value)->exists();

        // 🟢 Special Rule: If admin enters THEIR OWN username/email
        // while editing another user's info → ignore conflict
        if (auth()->check() && (auth()->user()->role === 'super_admin' && ! is_null($id))) {
            if ($authUserId != $id) {
                $isAdminOwnCredential = User::where('id', $authUserId)
                    ->where($type, $value)
                    ->exists();

                if ($isAdminOwnCredential) {
                    return response()->json(true); // treat as "not existing"
                }
            }
        }

        return response()->json($exists);
    }
}
