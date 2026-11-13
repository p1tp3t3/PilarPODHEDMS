<?php

namespace App\Http\Controllers\Modules\System;

use App\Events\MaintenanceModeToggled;
use App\Events\MaintenanceScheduleChanged;
use App\Exports\UserAccountExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Program\DestroyProgramRequest;
use App\Http\Requests\Program\StoreProgramRequest;
use App\Http\Requests\Program\UpdateProgramRequest;
use App\Http\Resources\ProgramResource;
use App\Http\Resources\UserResource;
use App\Jobs\ActivateScheduledMaintenanceJob;
use App\Jobs\SendMaintenanceNoticeJob;
use App\Models\ComplaintSubject;
use App\Models\ComplaintSubjectViolation;
use App\Models\Enrollment;
use App\Models\Penalty;
use App\Models\Position;
use App\Models\Program;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationPenalty;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Inertia\Inertia;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;

class MaintenanceController extends Controller
{
    public function index()
    {
        return Inertia::render('super-admin/system-maintenance', [
            'maintenance_mode' => Cache::get('maintenance_mode', false),
            'maintenance_mode_scheduled_at' => Cache::get('maintenance_mode_scheduled_at'),
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
    /**
     * One page of the Violation Management group: 'violations', 'penalties',
     * 'student-violations' or 'access'. Each loads only what it shows.
     */
    public function violationManagementIndex(string $section = 'violations')
    {
        // Prefect only (routes/auth.php).
        $props = ['section' => $section];

        // The violation form's penalty dropdowns need the penalties too.
        if (in_array($section, ['violations', 'penalties'], true)) {
            $props['penalty'] = Penalty::latest('created_at')->get();
        }

        if ($section === 'violations') {
            $props['violation'] = self::violationManagementList();
            $props['program'] = Program::all(['id', 'name', 'color_code']);
        }

        if ($section === 'student-violations') {
            $props['student_violation_list'] = self::getStudentViolationList();
        }

        return Inertia::render('prefect/violation-management', $props);
    }

    private function getStudentViolationList()
    {
        return ComplaintSubject::with([
            'complaint',
            'offenses.violation',
            'user.profile',
            'user.program',
            'user.enrollments.schoolYear',
            'user.faculty.program', 'user.headships.program',
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

                // Violations this student committed more than once, most
                // repeated first: [['name' => ..., 'count' => 3], ...].
                $repeats = $allOffenses
                    ->filter(fn ($offense) => $offense->violation)
                    ->groupBy('violation_id')
                    ->filter(fn ($same) => $same->count() > 1)
                    ->map(fn ($same) => ['name' => $same->first()->violation->violation_name, 'count' => $same->count()])
                    ->sortByDesc('count')
                    ->values();

                return [
                    'student_id' => $group->first()->user->id,
                    'user' => $group->first()->user,
                    'violation_count' => $allOffenses->count(),
                    'repeat_violations' => $repeats,
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
        if ($enabled) {
            Cache::forever('maintenance_mode_started_at', now()->toIso8601String());
            Cache::forget('maintenance_mode_message');
        } else {
            Cache::forget('maintenance_mode_started_at');
            Cache::forget('maintenance_mode_message');
        }

        // Toggling by hand (in either direction) supersedes any pending
        // schedule — most obviously so once it's already been turned on,
        // but also if a super admin decides to just flip it on themselves
        // before the scheduled time, or backs out and turns it off again.
        Cache::forget('maintenance_mode_scheduled_at');

        broadcast(new MaintenanceModeToggled($enabled));

        return response()->json(['maintenance_mode' => $enabled]);
    }

    /**
     * Schedules maintenance mode to turn itself on at a future date/time
     * instead of the super admin having to flip the switch by hand at that
     * moment. A delayed queue job (ActivateScheduledMaintenanceJob) is the
     * primary trigger — it fires at the right time regardless of whether a
     * cron/schedule:run trigger is set up on the server, since it only
     * needs the queue worker that's already running. The minute-by-minute
     * ActivateScheduledMaintenanceCommand is kept as a redundant fallback
     * for whichever server does have a working scheduler.
     */
    public function scheduleMaintenanceMode(Request $request)
    {
        if (Cache::get('maintenance_mode', false)) {
            return response()->json(['message' => 'Maintenance mode is already active.'], 400);
        }

        $data = $request->validate([
            'starts_at' => 'required|date|after:now',
            'message' => 'required|string',
        ]);

        Cache::forever('maintenance_mode_scheduled_at', $data['starts_at']);
        Cache::forever('maintenance_mode_message', $data['message']);

        ActivateScheduledMaintenanceJob::dispatch()->delay(Carbon::parse($data['starts_at']));
        self::broadcastSchedule();

        $notified = self::notifyAllUsers($data['message']);

        return response()->json([
            'maintenance_mode_scheduled_at' => $data['starts_at'],
            'notified' => $notified,
        ]);
    }

    public function cancelScheduledMaintenanceMode()
    {
        Cache::forget('maintenance_mode_scheduled_at');
        Cache::forget('maintenance_mode_message');
        self::broadcastSchedule();

        return response()->json(['message' => 'success']);
    }

    /**
     * The pending maintenance start as ISO 8601 (with the app's timezone, so
     * every browser counts down to the same moment), or null.
     */
    public static function scheduledAtIso(): ?string
    {
        $at = Cache::get('maintenance_mode_scheduled_at');
        if (Cache::get('maintenance_mode', false) || ! $at) {
            return null;
        }

        return Carbon::parse($at, config('app.timezone'))->toIso8601String();
    }

    /** For the title-bar countdown's periodic check (when live updates aren't running). */
    public function scheduleStatus()
    {
        return response()->json(['scheduled_at' => self::scheduledAtIso()]);
    }

    /** Tells every open page; a broadcasting failure (Reverb down) doesn't fail the request. */
    private static function broadcastSchedule(): void
    {
        try {
            broadcast(new MaintenanceScheduleChanged(self::scheduledAtIso()));
        } catch (\Throwable $e) {
            Log::warning('Maintenance schedule broadcast failed: '.$e->getMessage());
        }
    }

    /**
     * Turns maintenance mode on if a schedule is still pending and its time
     * has arrived — shared by ActivateScheduledMaintenanceJob (the delayed
     * job dispatched from scheduleMaintenanceMode(), the primary trigger)
     * and ActivateScheduledMaintenanceCommand (the scheduler-based
     * fallback). Self-validates against the current cache state, so it's
     * a safe no-op if the schedule was since canceled, rescheduled, or
     * already activated by the other trigger. Returns whether it activated.
     */
    public static function activateScheduledMaintenanceIfDue(): bool
    {
        $scheduledAt = Cache::get('maintenance_mode_scheduled_at');
        $now = now();
        $alreadyActive = Cache::get('maintenance_mode', false);

        if ($scheduledAt == null || $alreadyActive) {
            return false;
        }

        if ($now->lessThan($scheduledAt)) {
            return false;
        }

        Cache::forever('maintenance_mode', true);
        Cache::forever('maintenance_mode_started_at', now()->toIso8601String());
        Cache::forget('maintenance_mode_scheduled_at');

        broadcast(new MaintenanceModeToggled(true));

        return true;
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

        $notified = self::notifyAllUsers($request->message);

        return response()->json(['message' => 'success', 'notified' => $notified]);
    }

    /**
     * Shared by notifyMaintenance() (a standalone heads-up) and
     * scheduleMaintenanceMode() (the same notice sent as part of scheduling
     * a maintenance window in one step) — notifies every activated user
     * except the super admin sending it. Queued one job per recipient
     * (SendMaintenanceNoticeJob) instead of notifying everyone inline, so
     * this request doesn't block on hundreds of DB inserts/broadcasts.
     */
    private function notifyAllUsers(string $message): int
    {
        $senderId = auth()->id();

        $userIds = User::where('activate', true)
            ->where('id', '!=', $senderId)
            ->pluck('id');

        foreach ($userIds as $userId) {
            SendMaintenanceNoticeJob::dispatch($senderId, $userId, $message);
        }

        return $userIds->count();
    }

    /**
     * Server health snapshot for the Maintenance page's System Info tab —
     * fetched lazily (not on every page load) since disk/DB queries here,
     * while cheap, have no reason to run unless an admin actually opens it.
     */
    public function systemInfo()
    {
        $diskTotal = disk_total_space(base_path()) ?: null;
        $diskFree = disk_free_space(base_path()) ?: null;
        $diskUsed = ($diskTotal !== null && $diskFree !== null) ? $diskTotal - $diskFree : null;

        $connection = config('database.default');

        try {
            $dbVersion = DB::selectOne('select version() as v')->v ?? null;
        } catch (\Exception $e) {
            $dbVersion = null;
        }

        try {
            $dbSize = DB::selectOne(
                'select sum(data_length + index_length) as size from information_schema.tables where table_schema = ?',
                [config("database.connections.{$connection}.database")]
            )->size ?? null;
        } catch (\Exception $e) {
            $dbSize = null;
        }

        return response()->json([
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'server_os' => PHP_OS_FAMILY.' ('.php_uname('r').')',
            'app_env' => config('app.env'),
            'server_time' => now()->format('Y-m-d H:i:s'),
            'timezone' => config('app.timezone'),
            'memory_limit' => ini_get('memory_limit'),
            'memory' => $this->getMemoryInfo(),
            'disk' => [
                'total' => $diskTotal,
                'used' => $diskUsed,
                'free' => $diskFree,
            ],
            'database' => [
                'connection' => $connection,
                'version' => $dbVersion,
                'size' => $dbSize,
            ],
            'queues' => $this->getQueueInfo(),
        ]);
    }

    /**
     * The last slice of storage/logs/laravel.log (LOG_CHANNEL=stack /
     * LOG_STACK=single writes everything to this one file). Only the tail
     * end is returned — the full file can grow to many megabytes/gigabytes
     * over time, and reading all of it into memory on every request would
     * be wasteful (and slow) when recent entries are almost always what's
     * actually needed for debugging. The full file is still available via
     * downloadLog() below.
     */
    public function getLogs()
    {
        $path = storage_path('logs/laravel.log');

        if (! File::exists($path)) {
            return response()->json(['content' => '', 'size' => 0, 'truncated' => false, 'exists' => false]);
        }

        $size = File::size($path);

        // An empty file (e.g. right after Clear Log) — fread() refuses a
        // zero length, so answer before reading.
        if ($size === 0) {
            return response()->json(['content' => '', 'size' => 0, 'truncated' => false, 'exists' => true]);
        }

        $maxBytes = 500 * 1024;
        $start = max(0, $size - $maxBytes);

        $handle = fopen($path, 'r');
        fseek($handle, $start);
        $content = fread($handle, $size - $start);
        fclose($handle);

        // Started reading mid-file — drop the partial first line so the
        // displayed log doesn't open on a half-cut-off entry.
        if ($start > 0) {
            $firstNewline = strpos($content, "\n");
            $content = $firstNewline !== false ? substr($content, $firstNewline + 1) : $content;
        }

        // Reading from the middle can cut a multi-byte character in half;
        // substitute it instead of failing the whole JSON response.
        return response()->json([
            'content' => $content,
            'size' => $size,
            'truncated' => $start > 0,
            'exists' => true,
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    /**
     * Empties the log file rather than deleting it, so the app doesn't
     * have to recreate it (and whatever file permissions it was given) on
     * the next write.
     */
    public function clearLogs()
    {
        $path = storage_path('logs/laravel.log');

        if (File::exists($path)) {
            File::put($path, '');
        }

        return response()->json(['message' => 'success']);
    }

    public function downloadLog()
    {
        $path = storage_path('logs/laravel.log');

        abort_unless(File::exists($path), 404, 'No log file found.');

        return response()->download($path, 'laravel-'.now()->format('Y-m-d_His').'.log');
    }

    /**
     * Pending/failed job counts grouped by queue name — jobs are now
     * dispatched onto named queues by purpose (notifications, reports,
     * csv-processing) instead of the single default queue, so an admin can
     * see at a glance what kind of work is backed up.
     */
    private function getQueueInfo(): array
    {
        $pending = DB::table('jobs')
            ->selectRaw('queue, count(*) as count')
            ->groupBy('queue')
            ->pluck('count', 'queue');

        $failed = DB::table('failed_jobs')
            ->selectRaw('queue, count(*) as count')
            ->groupBy('queue')
            ->pluck('count', 'queue');

        $queueNames = $pending->keys()->merge($failed->keys())->unique()->sort()->values();

        return $queueNames->map(fn ($name) => [
            'name' => $name,
            'pending' => $pending[$name] ?? 0,
            'failed' => $failed[$name] ?? 0,
        ])->all();
    }

    /**
     * Linux: /proc/meminfo first (cheap, no process spawn), falling back to
     * shelling out to `free` if that file is blocked (open_basedir commonly
     * restricts it in hardened PHP-FPM pools, but doesn't affect what a
     * separate `free` process can read). Windows: PowerShell's
     * Get-CimInstance (wmic is deprecated/removed on newer Windows). This
     * page is super_admin-only with fixed command strings (no user input
     * reaches the shell), so shelling out here is safe. Degrades gracefully
     * to "unavailable" if nothing works.
     */
    private function getMemoryInfo(): array
    {
        if (! function_exists('shell_exec')) {
            return $this->memoryUnavailable('shell_exec() is disabled on this server.');
        }

        /*
        |--------------------------------------------------------------------------
        | Linux / Ubuntu
        |--------------------------------------------------------------------------
        */
        if (PHP_OS_FAMILY === 'Linux') {
            if (is_readable('/proc/meminfo')) {
                $meminfo = [];
                foreach (explode("\n", file_get_contents('/proc/meminfo')) as $line) {
                    if (preg_match('/^(\w+):\s+(\d+)/', $line, $matches)) {
                        $meminfo[$matches[1]] = (int) $matches[2] * 1024; // kB -> bytes
                    }
                }

                $total = $meminfo['MemTotal'] ?? null;
                $available = $meminfo['MemAvailable'] ?? $meminfo['MemFree'] ?? null;

                if ($total !== null && $available !== null) {
                    return [
                        'available' => true,
                        'total' => $total,
                        'used' => $total - $available,
                        'free' => $total - $available,
                        'available_memory' => $available,
                    ];
                }
            }

            // /proc/meminfo is commonly blocked by open_basedir in hardened
            // PHP-FPM pools — fall back to shelling out to `free`, which
            // isn't subject to PHP's own file-read restriction.
            $output = @shell_exec('free -b 2>/dev/null');

            if ($output) {
                /*
                * Example:
                *
                *               total        used        free      shared  buff/cache   available
                * Mem:      16777216000  5000000000  2000000000  ...
                *
                * We capture:
                * 1 = total
                * 2 = used
                * 3 = free
                * 4 = available
                */
                if (preg_match(
                    '/^Mem:\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+(\d+)/m',
                    $output,
                    $matches
                )) {
                    return [
                        'available' => true,
                        'total' => (int) $matches[1],
                        'used' => (int) $matches[2],
                        'free' => (int) $matches[3],
                        'available_memory' => (int) $matches[4],
                    ];
                }
            }

            return $this->memoryUnavailable(
                'The `free` command was unavailable or its output could not be parsed.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Windows
        |--------------------------------------------------------------------------
        */
        if (PHP_OS_FAMILY === 'Windows') {
            $output = @shell_exec(
                'powershell -NoProfile -Command ' .
                '"Get-CimInstance Win32_OperatingSystem | ' .
                'Select-Object -Property FreePhysicalMemory,TotalVisibleMemorySize | ' .
                'ConvertTo-Json"'
            );

            $data = $output ? json_decode($output, true) : null;

            if (
                is_array($data) &&
                isset(
                    $data['FreePhysicalMemory'],
                    $data['TotalVisibleMemorySize']
                )
            ) {
                /*
                * Windows reports these values in KB.
                * Convert KB -> bytes.
                */
                $total = (int) $data['TotalVisibleMemorySize'] * 1024;
                $free = (int) $data['FreePhysicalMemory'] * 1024;
                $used = $total - $free;

                return [
                    'available' => true,
                    'total' => $total,
                    'used' => $used,
                    'free' => $free,
                    'available_memory' => $free,
                ];
            }

            return $this->memoryUnavailable(
                'PowerShell Get-CimInstance query failed or returned no output.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Unsupported operating system
        |--------------------------------------------------------------------------
        */
        return $this->memoryUnavailable(
            'Unsupported OS family: ' . PHP_OS_FAMILY
        );
    }

    private function memoryUnavailable(string $reason): array
    {
        return [
            'available' => false,
            'total' => null,
            'used' => null,
            'free' => null,
            'available_memory' => null,
            'reason' => $reason,
        ];
    }

    public function programIndex()
    {
        return Inertia::render('super-admin/program', [
            'program' => ProgramResource::collection(self::programsWithUserCount()),
        ]);
    }

    /**
     * users_count = enrolled students + program heads and faculty, the same "in use"
     * definition destroyProgram() below already checks before allowing a delete.
     */
    private static function programsWithUserCount()
    {
        return Program::withCount([
            'enrollments as students_count' => fn ($q) => $q->where('status', 'enrolled'),
            'faculty as faculty_count',
            'programHead as program_head_count',
        ])
            // has_records picks the row's Archive vs Delete button.
            ->withExists(['enrollments as has_enrollment_records', 'faculty as has_faculty_records', 'programHead as has_head_records'])
            ->latest('created_at')
            ->orderByDesc('id')
            ->get()
            ->each(function ($p) {
                $p->has_records = (bool) ($p->has_enrollment_records || $p->has_faculty_records || $p->has_head_records);
            });
    }

    /**
     * Archive a program that has users or enrollments. Archived: not offered
     * when registering accounts, parents, or importing enrollments, and
     * read-only until restored; existing users, records and reports keep it.
     */
    public function archiveProgram(Request $request)
    {
        $program = Program::findOrFail($request->id);

        if (! $program->hasLinkedRecords()) {
            return response()->json([
                'status' => false,
                'message' => 'This program has no users or records, so it is deleted instead of archived.',
            ], 409);
        }
        if ($program->isArchived()) {
            return response()->json(['status' => false, 'message' => 'This program is already archived.'], 409);
        }

        $program->update(['archived_at' => now()]);

        return ProgramResource::collection(self::programsWithUserCount());
    }

    /** Bring an archived program back into use. */
    public function restoreProgram(Request $request)
    {
        $program = Program::findOrFail($request->id);
        $program->update(['archived_at' => null]);

        return ProgramResource::collection(self::programsWithUserCount());
    }

    /**
     * A 409 response if the name belongs to an archived program (other than
     * $exceptId), so it's restored instead of duplicated; null otherwise.
     */
    private static function archivedProgramNameConflict(string $name, $exceptId = null)
    {
        $archived = Program::whereNotNull('archived_at')
            ->whereRaw('LOWER(name) = ?', [strtolower(trim($name))])
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->first();

        return $archived ? response()->json([
            'status' => false,
            'message' => "{$archived->name} already exists in Archived. Restore it instead of adding it again.",
            'errors' => ['name' => ['This program is archived. Restore it from the Archived tab.']],
        ], 422) : null;
    }

    public function programUsersIndex($id)
    {
        $id = decrypt_id($id) ?? abort(404);

        $program = Program::with('programHead.user.profile')->findOrFail($id);

        $faculty = User::with(['profile', 'faculty.program', 'headships.program'])
            ->whereRole('faculty')
            ->whereHas('faculty', fn ($q) => $q->where('program_id', $id))
            ->latest('created_at')
            ->get();

        $students = User::with(['profile', 'program', 'enrollments'])
            ->whereRole('student')
            ->whereHas('enrollments', fn ($q) => $q->where('program_id', $id)->where('status', 'enrolled'))
            ->latest('created_at')
            ->get();

        return Inertia::render('super-admin/program-users', [
            'program' => new ProgramResource($program),
            'faculty' => UserResource::collection($faculty),
            'students' => UserResource::collection($students),
        ]);
    }

    public function programStore(StoreProgramRequest $request)
    {
        if ($conflict = self::archivedProgramNameConflict($request->name)) {
            return $conflict;
        }

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

        // Archived programs are read-only until restored.
        if ($program->isArchived()) {
            return response()->json(['status' => false, 'message' => 'This program is archived. Restore it before editing.'], 409);
        }
        // The acronym and full name can't be edited (anything sent for them
        // is ignored); only the color and logo change.
        $updateFields = [
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

        $program->update($updateFields);

        return ProgramResource::collection(self::programsWithUserCount());
    }

    public function destroyProgram(DestroyProgramRequest $request)
    {

        $program = Program::where('id', $request->id)->first();
        $programSlug = strtoupper($program->name);

        // Hard delete only when nothing points to it; one with users or
        // enrollments (even past ones) is archived instead (archiveProgram).
        if ($program->hasLinkedRecords()) {
            return response()->json([
                'status' => false,
                'message' => 'This program has users or enrollment records, so it can\'t be deleted. Archive it instead.',
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

        if ($conflict = self::archivedViolationNameConflict($data['violation_name'])) {
            return $conflict;
        }

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

        Http::withoutVerifying()
            ->withHeaders(['Authorization' => 'Bearer '.config('services.python_api.key')])
            ->post(config('services.python_api.url').'/api/violation/add', [
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

        // Archived violations are read-only until restored.
        if (Violation::findOrFail($request->id)->isArchived()) {
            return response()->json(['status' => false, 'message' => 'This violation is archived. Restore it before editing.'], 409);
        }
        if ($conflict = self::archivedViolationNameConflict($data['violation_name'], $request->id)) {
            return $conflict;
        }

        // UPDATE VIOLATION RECORD
        Violation::where('id', $request->id)->update([
            'violation_name' => $data['violation_name'],
            'offense_status' => $data['offense_status'],
            'keywords' => $data['keywords'],
        ]);

        // Keep the Python AI/ML API's violation dataset in sync — previously
        // only create/delete synced, so an edited name/keywords silently
        // never reached the Word2Vec matching feature at all.
        Http::withoutVerifying()
            ->withHeaders(['Authorization' => 'Bearer '.config('services.python_api.key')])
            ->post(config('services.python_api.url').'/api/violation/update', [
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

    /**
     * Hard delete: only for a violation nothing points to (no complaint or
     * student record). One with records is archived instead (archiveOffense).
     */
    public function destroyOffense(Request $request)
    {
        $violation = Violation::findOrFail($request->id);

        if ($violation->hasLinkedRecords()) {
            return response()->json([
                'status' => false,
                'message' => 'This violation has complaint records, so it can\'t be deleted. Archive it instead.',
            ], 409);
        }

        if (! $violation->isArchived()) {
            self::syncViolationToAnalyzer($violation, false);
        }
        // Its penalty ladder goes with it (violation_penalty cascades).
        $violation->delete();

        return self::getViolation();
    }

    /**
     * Archive a violation that has records. Archived: it can't be picked for
     * new complaints, the Complaint Context Analyzer stops suggesting it,
     * and it's read-only until restored; existing records, reports and
     * history keep it.
     */
    public function archiveOffense(Request $request)
    {
        $violation = Violation::findOrFail($request->id);

        if (! $violation->hasLinkedRecords()) {
            return response()->json([
                'status' => false,
                'message' => 'This violation has no records, so it is deleted instead of archived.',
            ], 409);
        }
        if ($violation->isArchived()) {
            return response()->json(['status' => false, 'message' => 'This violation is already archived.'], 409);
        }

        $violation->update(['archived_at' => now()]);
        self::syncViolationToAnalyzer($violation, false);

        return self::getViolation();
    }

    /** Bring an archived violation back into use (and back into the analyzer). */
    public function restoreOffense(Request $request)
    {
        $violation = Violation::findOrFail($request->id);

        if ($violation->isArchived()) {
            $violation->update(['archived_at' => null]);
            self::syncViolationToAnalyzer($violation, true);
        }

        return self::getViolation();
    }

    /**
     * A 409 response if the name belongs to an archived violation (other
     * than $exceptId), so it's restored instead of duplicated; null otherwise.
     */
    private static function archivedViolationNameConflict(string $name, $exceptId = null)
    {
        $archived = Violation::whereNotNull('archived_at')
            ->whereRaw('LOWER(violation_name) = ?', [strtolower(trim($name))])
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->first();

        return $archived ? response()->json([
            'status' => false,
            'message' => "{$archived->violation_name} already exists in Archived. Restore it instead of adding it again.",
            'errors' => ['violation_name' => ['This violation is archived. Restore it from the Archived tab.']],
        ], 422) : null;
    }

    /** Adds (active/restored) or removes (archived/deleted) it in the Python analyzer. */
    private static function syncViolationToAnalyzer(Violation $violation, bool $present): void
    {
        try {
            Http::withoutVerifying()
                ->withHeaders(['Authorization' => 'Bearer '.config('services.python_api.key')])
                ->timeout(15)
                ->post(config('services.python_api.url').($present ? '/api/violation/add' : '/api/violation/delete'), $present
                    ? [
                        'violation' => preg_replace('/[^\w\s]/', ' ', $violation->violation_name),
                        'keywords' => self::flattenKeywords($violation->keywords ?? []),
                        'id' => $violation->id,
                    ]
                    : ['id' => $violation->id]);
        } catch (\Exception $e) {
            Log::warning('Violation analyzer sync failed', ['id' => $violation->id, 'error' => $e->getMessage()]);
        }
    }

    public function penaltyStore(Request $request)
    {
        $data = $request->validate([
            'ref_number' => ['required', 'regex:/^\d{1,3}(\.\d)?$/', 'unique:penalty,ref_number'],
            'description' => 'required|string|max:191',
        ], [
            'ref_number.regex' => 'Use a reference number like 6 or 1.4.',
            'ref_number.unique' => 'That reference number is already used.',
        ]);

        // The penalty table needs a reference number and a name; the name and
        // description are the same text throughout the catalog.
        Penalty::insert([
            'ref_number' => $data['ref_number'],
            'name' => $data['description'],
            'description' => $data['description'],
        ]);

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
        return self::violationManagementList();
    }

    /**
     * The Violations page's rows (also returned after add / edit / delete /
     * archive / restore): penalties, encrypted id, and has_records, which
     * picks the row's Archive vs Delete button.
     */
    private static function violationManagementList()
    {
        return Violation::query()
            ->with(['penalties.penalty'])
            ->withExists(['subjectViolations as has_subject_records', 'complaints as has_complaint_records'])
            ->latest('created_at')
            ->orderByDesc('id')
            ->get()
            ->each(function ($v) {
                $v->encrypted_id = encrypt_id($v->id);
                $v->has_records = (bool) ($v->has_subject_records || $v->has_complaint_records);
                unset($v->has_subject_records, $v->has_complaint_records);
            });
    }
}
