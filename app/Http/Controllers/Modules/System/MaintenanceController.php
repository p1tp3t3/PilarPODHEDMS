<?php

namespace App\Http\Controllers\Modules\System;

use App\Events\MaintenanceModeToggled;
use App\Exports\UserAccountExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Program\DestroyProgramRequest;
use App\Http\Requests\Program\StoreProgramRequest;
use App\Http\Requests\Program\UpdateProgramRequest;
use App\Http\Resources\ProgramResource;
use App\Http\Resources\UserResource;
use App\Models\ComplaintSubject;
use App\Models\ComplaintSubjectViolation;
use App\Models\Enrollment;
use App\Models\Penalty;
use App\Models\Position;
use App\Models\Program;
use App\Models\TeachingStaff;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationPenalty;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;

class MaintenanceController extends Controller
{
    public function index()
    {
        return Inertia::render('itrc/system-maintenance', [
            'user' => auth()->user(),
            'maintenance_mode' => Cache::get('maintenance_mode', false),
        ]);
    }

    /**
     * Lightweight, unauthenticated-looking preview of what a regular visitor
     * currently sees, meant to be embedded in an iframe on the Maintenance
     * Mode tab. Renders purely off the cache flag — never exempted by role,
     * so it reflects the real state even when viewed by a super admin whose
     * own session bypasses the maintenance block.
     */
    public function preview()
    {
        return view('maintenance-preview', [
            'enabled' => Cache::get('maintenance_mode', false),
        ]);
    }

    /**
     * Violation type / penalty management — shared by super_admin and sub_admin,
     * moved out of the super_admin-only Maintenance page. Also carries the
     * "Student Violations" tab's data (folded in from the old standalone
     * /prefect/violation page, which duplicated this same section).
     */
    public function violationManagementIndex()
    {
        $violations = Violation::query()
            ->with(['penalties.penalty'])
            ->latest('created_at')
            ->get();

        return Inertia::render('other/violation-management', [
            'user' => auth()->user(),
            'violation' => $violations,
            'penalty' => Penalty::latest('created_at')->get(),
            'program' => Program::all(['id', 'name', 'color_code']),
            // Super admin manages the violation/penalty catalog but doesn't
            // get to see which students actually have violations — that's
            // student disciplinary data, not system configuration. Don't
            // even compute/send it for that role.
            'student_violation_list' => auth()->user()->role === 'super_admin'
                ? []
                : self::getStudentViolationList(),
        ]);
    }

    private function getStudentViolationList()
    {
        return ComplaintSubject::with([
            'complaint',
            'offenses.violation',
            'user.profile',
            'user.program',
            'user.enrollments.schoolYear',
            'user.teachingStaff.program',
        ])
            ->whereHas('complaint', function ($q) {
                $q->where('complaint_status', 'resolved');
            })
            ->get()
            ->groupBy(fn ($d) => $d->user->id)
            ->map(function ($group) {
                // ComplaintSubject::offenses() is only scoped by complaint_id (a
                // hasMany can't also be matched against the parent's own
                // student_id column) — must filter by student_id here too, or a
                // complaint with multiple student subjects double-counts every
                // other subject's offenses onto this one.
                $allOffenses = $group->flatMap(fn ($item) => $item->offenses->where('student_id', $item->student_id));
                $majorCount = $allOffenses
                    ->filter(fn ($offense) => optional($offense->violation)->offense_status === 1)
                    ->count();
                $minorCount = $allOffenses
                    ->filter(fn ($offense) => optional($offense->violation)->offense_status === 0)
                    ->count();

                return [
                    'student_id' => $group->first()->user->id,
                    'user' => $group->first()->user,
                    'violation_count' => $allOffenses->count(),
                    'major_count' => $majorCount,
                    'minor_count' => $minorCount,
                    'penalty_count' => $group->count(),
                ];
            })
            ->filter(fn ($item) => $item['violation_count'] > 0)
            ->values();
    }

    public function toggleMaintenanceMode(Request $request)
    {
        $enabled = $request->boolean('enabled');

        Cache::forever('maintenance_mode', $enabled);

        broadcast(new MaintenanceModeToggled($enabled));

        return response()->json(['maintenance_mode' => $enabled]);
    }

    /**
     * Broadcasts a heads-up (e.g. an upcoming maintenance window) to every
     * activated user except the super admin sending it — a normal in-app
     * notification, not the maintenance-mode lockdown itself.
     */
    public function notifyMaintenance(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $userIds = User::where('activate', true)
            ->where('id', '!=', auth()->id())
            ->pluck('id');

        foreach ($userIds as $userId) {
            notify_single_user(
                [
                    'sender_id' => auth()->id(),
                    'receiver_id' => $userId,
                    'notif_type' => 'maintenance_notice',
                    'content' => json_encode([
                        'sender_notif_message' => 'Sent a maintenance notice to all users.',
                        'receiver_notif_message' => $request->message,
                    ]),
                ],
                [
                    'title' => 'Scheduled Maintenance Notice',
                    'body' => strip_tags($request->message),
                    'url' => '',
                    'icon' => '',
                ]
            );
        }

        return response()->json(['message' => 'success', 'notified' => $userIds->count()]);
    }

    public function programIndex()
    {
        return Inertia::render('itrc/program', [
            'user' => auth()->user(),
            'program' => ProgramResource::collection(self::programsWithUserCount()),
        ]);
    }

    /**
     * users_count = enrolled students + teaching staff, the same "in use"
     * definition destroyProgram() below already checks before allowing a delete.
     */
    private static function programsWithUserCount()
    {
        return Program::withCount([
            'enrollments as students_count' => fn ($q) => $q->where('status', 'enrolled'),
            'teachingStaff as teaching_staff_count',
        ])
            ->latest('created_at')
            ->get();
    }

    public function programUsersIndex($id)
    {
        $program = Program::with('programHead.user.profile')->findOrFail($id);

        $faculty = User::with(['profile', 'teachingStaff.program'])
            ->where('role', 'teaching_staff')
            ->whereHas('teachingStaff', fn ($q) => $q->where('program_id', $id)->where('position_id', '!=', Position::idFor('program_head')))
            ->latest('created_at')
            ->get();

        $students = User::with(['profile', 'program', 'enrollments'])
            ->where('role', 'student')
            ->whereHas('enrollments', fn ($q) => $q->where('program_id', $id)->where('status', 'enrolled'))
            ->latest('created_at')
            ->get();

        return Inertia::render('itrc/program-users', [
            'user' => auth()->user(),
            'program' => new ProgramResource($program),
            'faculty' => UserResource::collection($faculty),
            'students' => UserResource::collection($students),
        ]);
    }

    public function programStore(StoreProgramRequest $request)
    {
        $data = [
            'name' => Str::upper($request->name),
            'description' => ucwords($request->description),
            'color_code' => $request->color,
        ];

        if ($request->hasFile('logo')) {
            $fileName = time().'_'.$request->file('logo')->getClientOriginalName();
            Storage::disk('public')->putFileAs('program-logos', $request->file('logo'), $fileName);
            $data['logo'] = $fileName;
        }

        $program = Program::create($data);

        $programId = $program->id;
        $programName = $program->name;

        /* =============================
        FACULTY CSV EXPORT (EMPTY)
        ============================= */
        $facultyHeader = ['id', 'name', 'program', 'username', 'password'];
        $facultyFile = "zips/faculty-account-{$programId}-{$programName}.csv";

        Excel::store(
            new UserAccountExport([$facultyHeader]),
            $facultyFile,
            'public',
            ExcelFormat::CSV
        );

        /* =============================
        STUDENT 4 CSVs -> ZIP EXPORT
        ============================= */
        // Slug program name for safe filename

        $programSlug = strtoupper(Str::slug($programName ?: 'unknown', '-'));

        // directory for zips
        $zipsDir = storage_path('app/private/zips');
        if (! File::exists($zipsDir)) {
            File::makeDirectory($zipsDir, 0775, true, true);
        }

        $zipPath = "{$zipsDir}/student-{$programId}-{$programSlug}.zip";
        if (File::exists($zipPath)) {
            File::delete($zipPath);
        }

        $zip = new \ZipArchive;
        $openStatus = $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        if ($openStatus !== true) {
            Log::error('ZIP FAILED', ['zipPath' => $zipPath, 'openStatus' => $openStatus]);
            throw new \Exception("Cannot create ZIP file: {$zipPath}");
        }

        // CSV headers
        $studentHeader = ['id', 'name', 'program', 'year_level', 'username', 'password'];

        // Write 4 CSV files directly into ZIP
        foreach ([1, 2, 3, 4] as $yearLevel) {
            $csvName = "student-account-{$programId}-{$programSlug}-year-{$yearLevel}.csv";
            $csvContent = implode(',', $studentHeader)."\n";
            $zip->addFromString($csvName, $csvContent);
        }

        $zip->close();

        Log::info('ZIP CREATED SUCCESSFULLY', ['zipPath' => $zipPath]);

        return ProgramResource::collection(self::programsWithUserCount());
    }

    public function updateProgram(UpdateProgramRequest $request)
    {
        $data = $request->validated();

        $program = Program::where('id', $request->id)->first();

        $oldSlug = strtoupper(Str::slug($program->name));
        $newSlug = strtoupper(Str::slug($data['name'], '-'));

        // Old file paths
        $oldFaculty = storage_path("app/private/zips/faculty-account-{$program->id}-{$oldSlug}.csv");
        $oldStudent = storage_path("app/private/zips/student-{$program->id}-{$oldSlug}.zip");

        // New file paths
        $newFaculty = storage_path("app/private/zips/faculty-account-{$program->id}-{$newSlug}.csv");
        $newStudent = storage_path("app/private/zips/student-{$program->id}-{$newSlug}.zip");

        $updateFields = [
            'name' => $data['name'],
            'description' => $data['description'],
            'color_code' => $data['color'],
        ];

        if ($request->hasFile('logo')) {
            $fileName = time().'_'.$request->file('logo')->getClientOriginalName();
            Storage::disk('public')->putFileAs('program-logos', $request->file('logo'), $fileName);

            if ($program->logo) {
                Storage::disk('public')->delete("program-logos/{$program->logo}");
            }

            $updateFields['logo'] = $fileName;
        }

        $program = Program::where('id', $request->id);
        // Update database
        $program->update($updateFields);

        // Rename files if exists
        if (file_exists($oldFaculty)) {
            rename($oldFaculty, $newFaculty);
        }

        if (file_exists($oldStudent)) {
            rename($oldStudent, $newStudent);
        }

        return ProgramResource::collection(self::programsWithUserCount());
    }

    public function destroyProgram(DestroyProgramRequest $request)
    {

        $program = Program::where('id', $request->id)->first();
        $programSlug = strtoupper($program->name);

        // Check related records
        $studentCount = Enrollment::where('program_id', $program->id)->where('status', 'enrolled')->count();
        $facultyCount = TeachingStaff::where('program_id', $program->id)->count();

        if ($studentCount > 0 || $facultyCount > 0) {
            return response()->json([
                'status' => false,
                'message' => 'Program cannot be deleted. Users are still assigned to this program.',
            ], 409);
        }

        // File paths
        $facultyFile = storage_path("app/private/zips/faculty-account-{$program->id}-{$programSlug}.csv");
        $studentZip = storage_path("app/private/zips/student-{$program->id}-{$programSlug}.zip");

        if ($program->logo) {
            Storage::disk('public')->delete("program-logos/{$program->logo}");
        }

        // Delete program
        $program->delete();

        // Delete files if exist
        if (file_exists($facultyFile)) {
            unlink($facultyFile);
        }
        if (file_exists($studentZip)) {
            unlink($studentZip);
        }

        return ProgramResource::collection(self::programsWithUserCount());
    }

    // Python's CSV/tokenizer expects a flat comma-separated string, while
    // Laravel stores keywords as a proper array column — flatten here only
    // for the outbound sync payload.
    private static function flattenKeywords(array $keywords): string
    {
        $cleaned = array_map(fn ($k) => preg_replace('/[^\w\s]/', ' ', $k), $keywords);

        return implode(', ', $cleaned);
    }

    public function offenseStore(Request $request)
    {
        // Validate violation
        $data = $request->validate([
            'violation_name' => 'required|string|max:191',
            'offense_status' => 'required|in:1,0',
            'penalties' => 'required|array',
            'keywords' => 'required|array|min:1',
            'keywords.*' => 'string|max:100',
        ]);

        // Create violation
        $violation = Violation::create([
            'violation_name' => $data['violation_name'],
            'offense_status' => $data['offense_status'],
            'keywords' => $data['keywords'],
        ]);

        // =============================
        // STORE VIOLATION PENALTIES
        // =============================
        foreach ($request->penalties as $penaltyOcc) {

            $occurrence = $penaltyOcc['occurrence'];

            foreach ($penaltyOcc['list'] as $p) {

                // Skip empty penalty selections
                if (empty($p['penalty_id'])) {
                    continue;
                }

                ViolationPenalty::insert([
                    'violation_id' => $violation->id,
                    'occurrence' => $occurrence,
                    'penalty_id' => $p['penalty_id'],
                ]);
            }
        }

        Http::withoutVerifying()->post('https://pitpete-violation-risk-predictor-api.hf.space/python/violation/add', [
            'violation' => preg_replace('/[^\w\s]/', ' ', $data['violation_name']),
            'keywords' => self::flattenKeywords($data['keywords'] ?? []),
            'id' => $violation->id,
        ]);

        return self::getViolation();
    }

    public function updateOffense(Request $request)
    {
        // VALIDATION
        $data = $request->validate([
            'violation_name' => 'required|string|max:191',
            'offense_status' => 'required|in:1,0',
            'penalties' => 'required|array',
            'keywords' => 'required|array|min:1',
            'keywords.*' => 'string|max:100',
        ]);

        // UPDATE VIOLATION RECORD
        Violation::where('id', $request->id)->update([
            'violation_name' => $data['violation_name'],
            'offense_status' => $data['offense_status'],
            'keywords' => $data['keywords'],
        ]);

        // Keep the Python AI/ML API's violation dataset in sync — previously
        // only create/delete synced, so an edited name/keywords silently
        // never reached the Word2Vec matching feature at all.
        Http::withoutVerifying()->post('https://pitpete-violation-risk-predictor-api.hf.space/python/violation/update', [
            'violation' => preg_replace('/[^\w\s]/', ' ', $data['violation_name']),
            'keywords' => self::flattenKeywords($data['keywords'] ?? []),
            'id' => $request->id,
        ]);

        // =============================
        // UPDATE VIOLATION PENALTIES
        // =============================

        // 1. Delete all existing penalties for this violation
        ViolationPenalty::where('violation_id', $request->id)->delete();

        // 2. Insert updated penalties
        foreach ($request->penalties as $penaltyOcc) {

            $occurrence = $penaltyOcc['occurrence'];

            foreach ($penaltyOcc['list'] as $p) {

                // Skip empty penalty selections
                if (empty($p['penalty_id'])) {
                    continue;
                }

                ViolationPenalty::insert([
                    'violation_id' => $request->id,
                    'occurrence' => $occurrence,
                    'penalty_id' => $p['penalty_id'],
                ]);
            }
        }

        // RETURN updated list with penalties included
        return self::getViolation();
    }

    public function destroyOffense(Request $request)
    {
        $violation = Violation::where('id', $request->id)->first();

        // Check related records
        $complaintCount = ComplaintSubjectViolation::where('violation_id', $request->id)->count();

        if ($complaintCount > 0) {
            return response()->json([
                'status' => false,
                'message' => 'Violation cannot be deleted. It is still assigned to complaint subjects.',
            ], 409);
        }

        Http::withoutVerifying()->post('https://pitpete-violation-risk-predictor-api.hf.space/python/violation/delete', [
            'id' => $violation->id,
        ]);
        // Delete violation
        $violation->delete();

        return self::getViolation();
    }

    public function penaltyStore(Request $request)
    {
        $data = $request->validate([
            'description' => 'required|string|max:191',
        ]);

        Penalty::insert($data);

        return Penalty::latest('created_at')->get();
    }

    public function destroyPenalty(Request $request)
    {
        $penalty = Penalty::where('id', $request->id)->first();

        // Delete violation
        $penalty->delete();

        return Penalty::latest('created_at')->get();
    }

    public function update($id, Request $request)
    {
        if ($request->type == 'program') {
            $data = $request->validate([
                'name' => 'required|string',
                'description' => 'required|string',
            ]);

            Program::where('id', $id)->update($data);

            return Program::latest('created_at')->get();
        }if ($request->type == 'violation') {
            $data = $request->validate([
                'violation_name' => 'required|string|max:191',
                'offense_status' => 'required|in:1,0',
            ]);

            Violation::where('id', $id)->update($data);

            return Violation::latest('created_at')->get();
        }

        return response()->json(['message' => 'error'], 400);
    }

    public function toggle($id, Request $request)
    {
        if ($request->type == 'program') {
            Program::where('id', $id)->update([
                'is_delete' => $request->delete,
            ]);

            return Program::latest('created_at')->get();
        }if ($request->type == 'violation') {
            Violation::where('id', $id)->update([
                'is_delete' => $request->delete,
            ]);

            return Violation::latest('created_at')->get();
        }

        return response()->json(['message' => 'error'], 400);
    }

    public function getViolation()
    {
        return Violation::query()
            ->with(['penalties' => function ($q) {
                $q->join('penalty', 'penalty.id', '=', 'violation_penalty.penalty_id')
                    ->select(
                        'violation_penalty.*',
                        'penalty.description as penalty_description'
                    );
            }])
            ->latest('created_at')
            ->get();
    }
}
