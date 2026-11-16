<?php

namespace App\Http\Controllers\Modules\Report;

use App\Http\Controllers\Controller;
use App\Models\ActionLog;
use App\Models\Enrollment;
use App\Models\Profile;
use App\Models\Program;
use App\Models\Report;
use App\Models\ReportFilter;
use App\Jobs\GenerateSystemReportJob;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * The super admin's extra report pages (/super-admin/report/{section}):
 *   account-activity  who logs in and when; inactive / never-logged-in accounts
 *   account-setup     accounts still on the default password or without a profile
 *   enrollment        enrollments per term, program and year level; new vs returning
 *   generator         Report Generator: saved report filters, generated as PDF /
 *                     Excel (GenerateSystemReportJob); /generated is its second tab
 * Each page's figures and table load from its API (list_page()).
 */
class SystemReportController extends Controller
{
    public const SECTIONS = ['account-activity', 'account-setup', 'enrollment', 'generator', 'generated'];

    /** Report Generator: the report types a super admin's filter can be. */
    public const REPORT_TYPES = [
        'account_statistics' => 'Account Statistics',
        'account_activity' => 'Account Activity',
        'account_setup' => 'Account Setup',
        'enrollment' => 'Enrollment',
        'action_log' => 'Action Log',
    ];


    private const ROLE_LABELS = [
        'super_admin' => 'System Admin', 'sub_admin' => 'Prefect', 'student' => 'Student', 'program_head' => 'Program Head',
        'faculty' => 'Faculty', 'non_teaching_staff' => 'Non-Teaching Staff', 'parent' => 'Parent',
    ];

    private const ROLE_COLORS = [
        'student' => '#3b82f6', 'faculty' => '#22c55e', 'program_head' => '#6366f1', 'non_teaching_staff' => '#f59e0b',
        'parent' => '#ec4899', 'sub_admin' => '#0ea5e9', 'super_admin' => '#9ca3af',
    ];

    public function index(string $section)
    {
        return list_page('super-admin/system-report', [
            'section' => $section,
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
            'current_school_year' => SchoolYearSemester::current()?->schoolYear?->year,
            'current_semester' => SchoolYearSemester::current()?->semester,
            // Report Generator: the report types, and the Action Log's action types.
            'report_types' => collect(self::REPORT_TYPES)->map(fn ($label, $val) => ['val' => $val, 'label' => $label])->values(),
            'action_types' => in_array($section, ['generator', 'generated'], true)
                ? ActionLog::distinct()->orderBy('action_type')->pluck('action_type')->map(fn ($t) => ['val' => $t, 'label' => ucwords(str_replace('_', ' ', $t))])->values()
                : [],
            // The page's figures and table (API).
            'report' => list_prop(fn () => $this->build($section, request())),
        ]);
    }

    /** One report's data: period label, cards, charts, table (columns + rows). */
    public function build(string $section, Request $request): array
    {
        return match ($section) {
            'account-activity' => $this->accountActivity($request),
            'account-setup' => $this->accountSetup($request),
            'enrollment' => $this->enrollment($request),
            // Report Generator (its Generated Reports tab: /generated).
            'generator', 'generated' => ['filters' => $this->reportFilters()] + $this->generatedReports(),
            default => abort(404),
        };
    }

    /**
     * A report type's data from a saved filter's values (Report Generator,
     * GenerateSystemReportJob): the same shape as the report pages.
     */
    public static function reportData(string $type, array $f): array
    {
        $self = app(self::class);
        $req = fn (array $q) => Request::create('/', 'GET', array_filter($q, fn ($v) => $v !== null && $v !== ''));

        // Individual report: one person (account activity, action log, enrollment).
        $person = self::individualId($f);
        $data = match ($type) {
            'account_activity' => $self->accountActivity($req(['days' => $f['days'] ?? 30, 'role' => $f['role'] ?? null, 'status' => $f['status'] ?? null, 'user_id' => $person])),
            'account_setup' => $self->accountSetup($req(['role' => $f['role'] ?? null, 'issue' => $f['issue'] ?? null])),
            'enrollment' => $self->enrollment($req(['school-year' => $f['school_year'] ?? 'all', 'semester' => $f['semester'] ?? 'all', 'user_id' => $person])),
            'action_log' => $self->actionLogReport($f + ['user_id' => $person]),
            'account_statistics' => $self->accountStatisticsReport($f),
            default => abort(404),
        };

        // Whose report it is (the PDF's heading).
        if ($person && ($u = User::with('profile')->find($person))) {
            $data['period'] = $self->nameOf($u).($u->id_number ? " ({$u->id_number})" : '').' · '.$data['period'];
        }

        return $data;
    }

    /** The person of an individual report filter (null for everyone). */
    private static function individualId(array $f): ?int
    {
        return filter_var($f['individual'] ?? false, FILTER_VALIDATE_BOOLEAN) && is_numeric($f['student_id'] ?? null) ? (int) $f['student_id'] : null;
    }

    /** "SY 2025-2026, 1st Semester" / "Jan 1, 2026 to Mar 1, 2026" / "All Time". */
    private static function periodOf(array $f): string
    {
        $sem = [1 => '1st Semester', 2 => '2nd Semester'][(int) ($f['semester'] ?? 0)] ?? null;
        if (($f['filter_by'] ?? null) === 'school_year' || (! empty($f['school_year']) && empty($f['date_from']))) {
            $year = $f['school_year'] ?? 'all';

            return ($year === 'all' ? 'All School Years' : "SY {$year}").', '.($sem ?? 'All Semesters');
        }
        if (! empty($f['date_from']) && ! empty($f['date_to'])) {
            return Carbon::parse($f['date_from'])->format('M j, Y').' to '.Carbon::parse($f['date_to'])->format('M j, Y');
        }
        if (! empty($f['date_from'])) {
            return 'From '.Carbon::parse($f['date_from'])->format('M j, Y');
        }
        if (! empty($f['date_to'])) {
            return 'Until '.Carbon::parse($f['date_to'])->format('M j, Y');
        }

        return 'All Time';
    }

    /** Account Statistics (ReportController::buildAccountStatistics) in the report pages' shape. */
    private function accountStatisticsReport(array $f): array
    {
        $bySchoolYear = ($f['filter_by'] ?? 'date') === 'school_year';
        $year = $f['school_year'] ?? 'all';
        $s = ReportController::buildAccountStatistics(
            $bySchoolYear ? 'school_year' : 'date',
            $bySchoolYear ? null : ($f['date_from'] ?? null),
            $bySchoolYear ? null : ($f['date_to'] ?? null),
            $bySchoolYear ? ($year === 'all' ? 'all' : SchoolYear::where('year', $year)->value('id')) : null,
            $bySchoolYear && in_array((string) ($f['semester'] ?? ''), ['1', '2'], true) ? (int) $f['semester'] : null,
        );

        return [
            'period' => self::periodOf($f),
            'cards' => $s['cards'],
            'charts' => $s['charts'],
            'table' => [
                'columns' => [
                    ['field' => 'program', 'label' => 'Program'], ['field' => 'name', 'label' => 'Program Name'], ['field' => 'students', 'label' => 'Students'],
                    ['field' => 'program_heads', 'label' => 'Program Heads'], ['field' => 'faculty', 'label' => 'Faculty'], ['field' => 'total', 'label' => 'Total'],
                ],
                'rows' => $s['program_accounts'],
            ],
        ];
    }

    /** Action Log: what was done, by whom, when (date range / action type). */
    private function actionLogReport(array $f): array
    {
        $from = ! empty($f['date_from']) ? Carbon::parse($f['date_from'])->startOfDay() : null;
        $to = ! empty($f['date_to']) ? Carbon::parse($f['date_to'])->endOfDay() : null;
        $type = $f['action_type'] ?? 'all';
        $logs = ActionLog::with(['user.currentUserRole.role', 'user.profile:user_id,first_name,last_name'])
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->when($type && $type !== 'all', fn ($q) => $q->where('action_type', $type))
            ->when(! empty($f['user_id']), fn ($q) => $q->where('user_id', (int) $f['user_id']))
            ->latest('created_at')->get();

        $label = fn ($t) => ucwords(str_replace('_', ' ', (string) $t));
        $byDay = $logs->countBy(fn ($l) => Carbon::parse($l->created_at)->format('Y-m-d'))->sortKeys();
        $useMonths = $byDay->count() > 62;
        $series = $useMonths
            ? $logs->countBy(fn ($l) => Carbon::parse($l->created_at)->format('Y-m'))->sortKeys()->map(fn ($n, $k) => ['label' => Carbon::parse($k.'-01')->format('M Y'), 'value' => $n])->values()->all()
            : $byDay->map(fn ($n, $k) => ['label' => Carbon::parse($k)->format('M d'), 'value' => $n])->values()->all();
        $top = $logs->countBy('action_type')->sortDesc();

        return [
            'period' => self::periodOf($f).($type && $type !== 'all' ? ' · '.$label($type) : ''),
            'cards' => [
                ['label' => 'Recorded Actions', 'value' => $logs->count(), 'icon' => 'list'],
                ['label' => 'Users', 'value' => $logs->pluck('user_id')->unique()->count(), 'icon' => 'users'],
                ['label' => 'Logins', 'value' => $logs->where('action_type', 'login')->count(), 'icon' => 'check'],
                ['label' => 'Most Common', 'value' => $top->keys()->first() ? $label($top->keys()->first()) : '—', 'icon' => 'chart'],
            ],
            'charts' => [
                ['title' => $useMonths ? 'Actions per Month' : 'Actions per Day', 'type' => 'line', 'data' => $series, 'wide' => true],
                ['title' => 'Actions by Type', 'type' => 'hbar', 'data' => $top->take(10)->map(fn ($n, $t) => ['label' => $label($t), 'value' => $n])->values()->all()],
                ['title' => 'Actions by Role', 'type' => 'doughnut', 'data' => $this->roleSlices($logs->map(fn ($l) => $l->user?->role)->filter())],
            ],
            'table' => [
                'columns' => [
                    ['field' => 'date', 'label' => 'Date'], ['field' => 'name', 'label' => 'Name'], ['field' => 'id_number', 'label' => 'ID Number'],
                    ['field' => 'role', 'label' => 'Role'], ['field' => 'action', 'label' => 'Action'], ['field' => 'details', 'label' => 'Details'],
                ],
                'rows' => $logs->map(fn ($l) => [
                    'id' => $l->id,
                    'date' => $this->fmt($l->created_at),
                    'name' => $l->user ? $this->nameOf($l->user) : '—',
                    'id_number' => $l->user?->id_number,
                    'role' => self::ROLE_LABELS[$l->user?->role] ?? null,
                    'action' => $label($l->action_type),
                    'details' => strip_tags((string) $l->details),
                ])->all(),
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Report Generator: saved filters, generation
    // ------------------------------------------------------------------

    /** The super admin's saved report filters, with a readable summary. */
    private function reportFilters(): array
    {
        return ReportFilter::where('user_id', auth()->id())
            ->whereIn('report_type', array_keys(self::REPORT_TYPES))
            ->latest('created_at')->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'name' => $f->name,
                'report_type' => $f->report_type,
                'type_label' => self::REPORT_TYPES[$f->report_type],
                'filters' => $f->filters ?? [],
                'summary' => $this->filterSummary($f->report_type, $f->filters ?? []),
                'created' => $this->fmt($f->created_at),
                'individual' => self::individualId($f->filters ?? []) !== null,
                'school_year' => $f->filters['school_year'] ?? null,
                'semester' => isset($f->filters['semester']) ? (string) $f->filters['semester'] : null,
            ])->all();
    }

    private function filterSummary(string $type, array $f): string
    {
        $role = fn ($r) => $r && $r !== 'all' ? (self::ROLE_LABELS[$r] ?? $r) : 'All roles';
        $days = (int) ($f['days'] ?? 30);
        $who = self::individualId($f) ? 'Individual: '.($f['student_name'] ?? 'one person') : null;
        if ($who) {
            return $who.' · '.match ($type) {
                'account_activity' => $days === 365 ? 'Last 12 months' : "Last {$days} days",
                'enrollment' => 'All terms',
                default => self::periodOf($f),
            };
        }

        return match ($type) {
            'account_activity' => implode(' · ', [$days === 365 ? 'Last 12 months' : "Last {$days} days", $role($f['role'] ?? null),
                ['active' => 'Active', 'inactive' => 'Inactive (30+ days)', 'never' => 'Never logged in'][$f['status'] ?? ''] ?? 'All statuses']),
            'account_setup' => implode(' · ', [$role($f['role'] ?? null), ['profile' => 'Profile not set up', 'password' => 'Must change password'][$f['issue'] ?? ''] ?? 'All pending']),
            'action_log' => self::periodOf($f).(($f['action_type'] ?? 'all') !== 'all' ? ' · '.ucwords(str_replace('_', ' ', $f['action_type'])) : ''),
            default => self::periodOf($f),
        };
    }

    /** Only the fields the filter's type uses (validated). */
    private function filterValues(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'report_type' => 'required|in:'.implode(',', array_keys(self::REPORT_TYPES)),
            'filter_by' => 'nullable|in:date,school_year',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'school_year' => 'nullable|string|max:20',
            'semester' => 'nullable|in:all,1,2',
            'days' => 'nullable|in:7,30,90,365',
            'role' => 'nullable|string|max:40',
            'status' => 'nullable|in:all,active,inactive,never',
            'issue' => 'nullable|in:all,profile,password',
            'action_type' => 'nullable|string|max:60',
            // Individual report: one person (account activity, action log, enrollment).
            'individual' => 'nullable|boolean',
            'student_id' => 'nullable|required_if:individual,true,1|integer|exists:users,id',
            'student_name' => 'nullable|string|max:150',
        ]);
        $keep = [
            'account_statistics' => ['filter_by', 'date_from', 'date_to', 'school_year', 'semester'],
            'account_activity' => ['days', 'role', 'status', 'individual', 'student_id', 'student_name'],
            'account_setup' => ['role', 'issue'],
            'enrollment' => ['school_year', 'semester', 'individual', 'student_id', 'student_name'],
            'action_log' => ['date_from', 'date_to', 'action_type', 'individual', 'student_id', 'student_name'],
        ][$data['report_type']];
        $values = array_intersect_key($data, array_flip($keep)) + ['type' => $data['report_type']];
        // Not individual: no person kept.
        if (! filter_var($values['individual'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            unset($values['individual'], $values['student_id'], $values['student_name']);
        } else {
            $values['individual'] = true;
            // The person's name, from the account (shown in the filter list).
            $u = User::with('profile')->find($values['student_id']);
            $values['student_name'] = $u ? $this->nameOf($u) : ($values['student_name'] ?? null);
        }

        return $values;
    }

    private function myFilter($id): ReportFilter
    {
        return ReportFilter::where('user_id', auth()->id())->whereIn('report_type', array_keys(self::REPORT_TYPES))->findOrFail($id);
    }

    public function storeFilter(Request $request)
    {
        $values = $this->filterValues($request);
        ReportFilter::create([
            'user_id' => auth()->id(),
            'report_type' => $values['type'],
            'name' => $request->input('name'),
            'filters' => $values,
        ]);

        return response()->json(['message' => 'saved']);
    }

    public function updateFilter(Request $request, $id)
    {
        $filter = $this->myFilter($id);
        // The type stays (a filter is for one report).
        $request->merge(['report_type' => $filter->report_type]);
        $filter->update(['name' => $request->input('name'), 'filters' => $this->filterValues($request)]);

        return response()->json(['message' => 'saved']);
    }

    public function destroyFilter($id)
    {
        $this->myFilter($id)->delete();

        return response()->json(['message' => 'deleted']);
    }

    /** Queues the filter's report as a PDF or Excel; its progress shows on the row ("filter-<id>"). */
    public function generate(Request $request, $id)
    {
        $filter = $this->myFilter($id);
        $fileType = $request->validate(['file_type' => 'required|in:pdf,excel'])['file_type'];

        GenerateSystemReportJob::dispatch($filter->report_type, $filter->filters ?? [], $fileType, auth()->id(), "filter-{$filter->id}");

        return response()->json(['message' => 'queued', 'track_id' => "filter-{$filter->id}"]);
    }

    // ------------------------------------------------------------------
    // Shared
    // ------------------------------------------------------------------

    /** Accounts with what the reports show (role, name, ID, program). */
    private function accounts(): Collection
    {
        return User::with(['currentUserRole.role', 'profile:user_id,first_name,last_name,sex', 'program:id,code', 'enrollments.program:id,code', 'faculty.program:id,code', 'headships.program:id,code'])
            ->get(['id', 'id_number', 'created_at', 'activate', 'already_update_profile', 'must_change_password', 'last_seen']);
    }

    private function nameOf(User $u): string
    {
        return trim(($u->profile->first_name ?? '').' '.($u->profile->last_name ?? '')) ?: ($u->id_number ?? '—');
    }

    private function programOf(User $u): ?string
    {
        if ($u->role === 'student') {
            return $u->program?->code ?? $u->enrollments->last()?->program?->code;
        }
        if (in_array($u->role, ['program_head', 'faculty'], true)) {
            return $u->faculty?->program?->code ?? $u->headships->first()?->program?->code;
        }

        return null;
    }

    private function fmt($date, bool $time = true): ?string
    {
        return $date ? Carbon::parse($date)->format($time ? 'M d, Y g:i A' : 'M d, Y') : null;
    }

    private function roleSlices(Collection $roles): array
    {
        $counts = $roles->countBy();

        return collect(self::ROLE_LABELS)
            ->map(fn ($label, $role) => ['label' => $label, 'value' => (int) ($counts[$role] ?? 0), 'color' => self::ROLE_COLORS[$role]])
            ->filter(fn ($d) => $d['value'] > 0)->values()->all();
    }

    private function pct($n, $of): string
    {
        return $of ? round($n / $of * 100).'%' : '0%';
    }

    // ------------------------------------------------------------------
    // Account Activity
    // ------------------------------------------------------------------

    private function accountActivity(Request $request): array
    {
        $days = in_array((int) $request->query('days'), [7, 30, 90, 365], true) ? (int) $request->query('days') : 30;
        $since = now()->subDays($days - 1)->startOfDay();
        $inactiveAfter = now()->subDays(30);

        $logins = ActionLog::where('action_type', 'login')->get(['user_id', 'created_at']);
        $lastLogin = $logins->groupBy('user_id')->map(fn ($g) => $g->max('created_at'));
        $periodLogins = $logins->filter(fn ($l) => Carbon::parse($l->created_at)->gte($since));
        $periodCount = $periodLogins->countBy('user_id');

        $users = $this->accounts();
        // Individual: that one account (and its logins).
        if (is_numeric($request->query('user_id'))) {
            $users = $users->where('id', (int) $request->query('user_id'))->values();
            $periodLogins = $periodLogins->where('user_id', (int) $request->query('user_id'))->values();
        }
        $rows = $users->map(function (User $u) use ($lastLogin, $periodCount, $inactiveAfter) {
            $last = $lastLogin[$u->id] ?? null;
            $seen = $u->last_seen;
            $latest = collect([$last, $seen])->filter()->max();
            $status = ! $latest ? 'never' : (Carbon::parse($latest)->lt($inactiveAfter) ? 'inactive' : 'active');

            return [
                'id' => $u->id,
                'name' => $this->nameOf($u),
                'id_number' => $u->id_number,
                'role' => $u->role,
                'role_label' => self::ROLE_LABELS[$u->role] ?? $u->role,
                'program' => $this->programOf($u),
                'last_login' => $this->fmt($last),
                'last_seen' => $this->fmt($seen),
                'logins' => (int) ($periodCount[$u->id] ?? 0),
                'status' => $status,
                'online' => $seen && Carbon::parse($seen)->gte(now()->subMinutes(5)),
            ];
        });

        $roleOf = $users->pluck('role', 'id');
        $active = $rows->where('logins', '>', 0)->count();
        $statusCounts = $rows->countBy('status');

        // Logins over the period: per day (per month for a year).
        $perPeriod = [];
        if ($days === 365) {
            $counts = $periodLogins->countBy(fn ($l) => Carbon::parse($l->created_at)->format('Y-m'));
            for ($c = now()->subMonths(11)->startOfMonth(); $c->lte(now()); $c->addMonth()) {
                $perPeriod[] = ['label' => $c->format('M Y'), 'value' => (int) ($counts[$c->format('Y-m')] ?? 0)];
            }
        } else {
            $counts = $periodLogins->countBy(fn ($l) => Carbon::parse($l->created_at)->toDateString());
            for ($c = $since->copy(); $c->lte(now()); $c->addDay()) {
                $perPeriod[] = ['label' => $c->format('M d'), 'value' => (int) ($counts[$c->toDateString()] ?? 0)];
            }
        }
        $byHour = $periodLogins->countBy(fn ($l) => (int) Carbon::parse($l->created_at)->format('G'));

        // The table, narrowed by the page's role / status filters.
        $role = $request->query('role');
        $status = $request->query('status');
        $table = $rows
            ->when($role && $role !== 'all', fn ($c) => $c->where('role', $role))
            ->when($status && $status !== 'all', fn ($c) => $c->where('status', $status))
            ->sortByDesc(fn ($r) => [$r['logins'], $r['last_login'] ? Carbon::parse($r['last_login'])->timestamp : 0])
            ->values();
        $statusLabel = ['active' => 'Active', 'inactive' => 'Inactive (30+ days)', 'never' => 'Never logged in'];

        return [
            'period' => $days === 365 ? 'Last 12 months' : "Last {$days} days",
            'cards' => [
                ['label' => 'Logins', 'value' => $periodLogins->count(), 'icon' => 'chart'],
                ['label' => 'Users Logged In', 'value' => $active, 'hint' => $this->pct($active, $rows->count()), 'icon' => 'users'],
                ['label' => 'Online Now', 'value' => $rows->where('online', true)->count(), 'icon' => 'check'],
                ['label' => 'Inactive 30+ Days', 'value' => (int) ($statusCounts['inactive'] ?? 0), 'icon' => 'clock'],
                ['label' => 'Never Logged In', 'value' => (int) ($statusCounts['never'] ?? 0), 'icon' => 'x'],
            ],
            'charts' => [
                ['title' => $days === 365 ? 'Logins per Month' : 'Logins per Day', 'type' => 'line', 'data' => $perPeriod, 'wide' => true],
                ['title' => 'Logins by Role', 'type' => 'doughnut', 'data' => $this->roleSlices($periodLogins->map(fn ($l) => $roleOf[$l->user_id] ?? null)->filter())],
                ['title' => 'Account Status', 'subtitle' => 'Last login or activity', 'type' => 'doughnut', 'data' => array_values(array_filter([
                    ['label' => 'Active', 'value' => (int) ($statusCounts['active'] ?? 0), 'color' => '#22c55e'],
                    ['label' => 'Inactive (30+ days)', 'value' => (int) ($statusCounts['inactive'] ?? 0), 'color' => '#f59e0b'],
                    ['label' => 'Never logged in', 'value' => (int) ($statusCounts['never'] ?? 0), 'color' => '#ef4444'],
                ], fn ($d) => $d['value'] > 0))],
                ['title' => 'Logins by Hour of Day', 'subtitle' => 'When users sign in', 'type' => 'bar', 'wide' => true, 'data' => $periodLogins->isEmpty() ? [] : collect(range(0, 23))
                    ->map(fn ($h) => ['label' => Carbon::createFromTime($h)->format('g A'), 'value' => (int) ($byHour[$h] ?? 0)])->all()],
            ],
            'table' => [
                'columns' => [
                    ['field' => 'name', 'label' => 'Name'], ['field' => 'id_number', 'label' => 'ID Number'], ['field' => 'role_label', 'label' => 'Role'],
                    ['field' => 'program', 'label' => 'Program'], ['field' => 'logins', 'label' => 'Logins'], ['field' => 'last_login', 'label' => 'Last Login'],
                    ['field' => 'last_seen', 'label' => 'Last Seen'], ['field' => 'status_label', 'label' => 'Status'],
                ],
                'rows' => $table->map(fn ($r) => $r + ['status_label' => $statusLabel[$r['status']]])->all(),
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Account Setup
    // ------------------------------------------------------------------

    private function accountSetup(Request $request): array
    {
        $users = $this->accounts()->filter(fn ($u) => $u->role !== 'super_admin');
        $lastLogin = ActionLog::where('action_type', 'login')->get(['user_id', 'created_at'])
            ->groupBy('user_id')->map(fn ($g) => $g->max('created_at'));

        $issueOf = fn (User $u) => ! $u->already_update_profile ? 'profile' : ($u->must_change_password ? 'password' : null);
        $pending = $users->filter(fn ($u) => $issueOf($u) !== null);
        $issueLabel = ['profile' => 'Profile not set up', 'password' => 'Must change password'];

        $rows = $pending->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $this->nameOf($u),
            'id_number' => $u->id_number,
            'role' => $u->role,
            'role_label' => self::ROLE_LABELS[$u->role] ?? $u->role,
            'program' => $this->programOf($u),
            'created' => $this->fmt($u->created_at, false),
            'last_login' => $this->fmt($lastLogin[$u->id] ?? null) ?? 'Never',
            'issue' => $issueOf($u),
            'issue_label' => $issueLabel[$issueOf($u)],
            'can_reset' => $u->id_number && ($u->profile->last_name ?? null),
        ]);

        $role = $request->query('role');
        $issue = $request->query('issue');
        $table = $rows
            ->when($role && $role !== 'all', fn ($c) => $c->where('role', $role))
            ->when($issue && $issue !== 'all', fn ($c) => $c->where('issue', $issue))
            ->sortBy('name')->values();

        $total = $users->count();
        $byProgram = $pending->map(fn ($u) => $this->programOf($u))->filter()->countBy()->sortDesc()
            ->map(fn ($n, $code) => ['label' => $code, 'value' => $n])->values()->all();

        return [
            'period' => 'As of '.now()->format('F d, Y'),
            'cards' => [
                ['label' => 'Pending Setup', 'value' => $pending->count(), 'hint' => $this->pct($pending->count(), $total), 'icon' => 'clock'],
                ['label' => 'Profile Not Set Up', 'value' => $rows->where('issue', 'profile')->count(), 'icon' => 'user'],
                ['label' => 'Must Change Password', 'value' => $rows->where('issue', 'password')->count(), 'icon' => 'shield'],
                ['label' => 'Never Logged In', 'value' => $rows->where('last_login', 'Never')->count(), 'icon' => 'x'],
                ['label' => 'Setup Completed', 'value' => $total - $pending->count(), 'hint' => $this->pct($total - $pending->count(), $total), 'icon' => 'check'],
            ],
            'charts' => [
                ['title' => 'Pending Setup by Role', 'type' => 'doughnut', 'data' => $this->roleSlices($pending->map(fn ($u) => $u->role))],
                ['title' => 'Setup Status', 'subtitle' => 'All accounts', 'type' => 'doughnut', 'data' => array_values(array_filter([
                    ['label' => 'Completed', 'value' => $total - $pending->count(), 'color' => '#22c55e'],
                    ['label' => 'Profile not set up', 'value' => $rows->where('issue', 'profile')->count(), 'color' => '#f59e0b'],
                    ['label' => 'Must change password', 'value' => $rows->where('issue', 'password')->count(), 'color' => '#ef4444'],
                ], fn ($d) => $d['value'] > 0))],
                ['title' => 'Pending Setup by Program', 'subtitle' => 'Students, program heads and faculty', 'type' => 'bar', 'data' => $byProgram, 'wide' => true],
            ],
            'table' => [
                'columns' => [
                    ['field' => 'name', 'label' => 'Name'], ['field' => 'id_number', 'label' => 'ID Number'], ['field' => 'role_label', 'label' => 'Role'],
                    ['field' => 'program', 'label' => 'Program'], ['field' => 'created', 'label' => 'Account Created'], ['field' => 'last_login', 'label' => 'Last Login'],
                    ['field' => 'issue_label', 'label' => 'Pending'],
                ],
                'rows' => $table->all(),
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Enrollment
    // ------------------------------------------------------------------

    private function enrollment(Request $request): array
    {
        if (is_numeric($request->query('user_id'))) {
            return $this->studentEnrollment((int) $request->query('user_id'));
        }

        // Opens on the current term, or (if it has no enrollments yet) the
        // latest term that has.
        $current = SchoolYearSemester::current();
        if ($current && ! Enrollment::where('school_year_id', $current->school_year_id)->where('semester', $current->semester)->exists()) {
            $latest = Enrollment::join('school_year', 'school_year.id', '=', 'enrollment.school_year_id')
                ->orderByDesc('school_year.year')->orderByDesc('enrollment.semester')
                ->first(['enrollment.school_year_id', 'enrollment.semester']);
            $current = $latest ? (object) ['schoolYear' => (object) ['year' => SchoolYear::where('id', $latest->school_year_id)->value('year')], 'semester' => (int) $latest->semester] : $current;
        }
        $yearParam = $request->query('school-year');
        $year = $yearParam && $yearParam !== 'all' ? $yearParam : ($yearParam === 'all' ? null : $current?->schoolYear?->year);
        $schoolYearId = $year ? SchoolYear::where('year', $year)->value('id') : null;
        $semParam = $request->query('semester');
        $semester = in_array((string) $semParam, ['1', '2'], true) ? (int) $semParam : ($semParam === 'all' || ! $current ? null : ($yearParam ? null : $current->semester));

        $rows = Enrollment::with('program:id,code,name')
            ->when($schoolYearId, fn ($q) => $q->where('school_year_id', $schoolYearId))
            ->when($semester, fn ($q) => $q->where('semester', $semester))
            ->get(['id', 'student_id', 'program_id', 'school_year_id', 'semester', 'year_level', 'status']);

        // New: the student's first enrollment is one of these rows.
        $firstIds = Enrollment::selectRaw('MIN(id) AS id')->groupBy('student_id')->pluck('id')->flip();
        $students = $rows->pluck('student_id')->unique();
        $newStudents = $rows->filter(fn ($r) => isset($firstIds[$r->id]))->pluck('student_id')->unique();
        $dropped = $rows->where('status', '!=', 'enrolled')->count();

        // Per program x year level (distinct students).
        $table = Program::orderBy('code')->get(['id', 'code', 'name'])->map(function ($p) use ($rows, $newStudents) {
            $mine = $rows->where('program_id', $p->id);
            $level = fn ($l) => $mine->where('year_level', $l)->pluck('student_id')->unique()->count();
            $ids = $mine->pluck('student_id')->unique();

            return [
                'id' => $p->id, 'program' => $p->code, 'name' => $p->name,
                'year1' => $level(1), 'year2' => $level(2), 'year3' => $level(3), 'year4' => $level(4),
                'new' => $ids->intersect($newStudents)->count(),
                'total' => $ids->count(),
            ];
        });

        // Trend: distinct students per term (every school year / semester).
        $years = SchoolYear::pluck('year', 'id');
        $trend = Enrollment::selectRaw('school_year_id, semester, COUNT(DISTINCT student_id) AS n')
            ->groupBy('school_year_id', 'semester')->get()
            ->sortBy(fn ($r) => ($years[$r->school_year_id] ?? '').'-'.$r->semester)
            ->map(fn ($r) => ['label' => 'SY '.($years[$r->school_year_id] ?? '?').' · '.($r->semester == 1 ? '1st' : '2nd').' Sem', 'value' => (int) $r->n])
            ->values()->all();

        $sex = Profile::whereIn('user_id', $students)->pluck('sex', 'user_id');
        $sexCounts = $students->map(fn ($id) => $sex[$id] ?? 'u')->countBy();
        $levelCounts = $rows->groupBy('year_level')->map(fn ($g) => $g->pluck('student_id')->unique()->count());
        $periodLabel = ($year ? "School Year {$year}" : 'All School Years').' · '.($semester ? ($semester === 1 ? '1st Semester' : '2nd Semester') : 'All Semesters');

        return [
            'period' => $periodLabel,
            'filter' => ['school_year' => $year ?? 'all', 'semester' => $semester ? (string) $semester : 'all'],
            'cards' => [
                ['label' => 'Enrolled Students', 'value' => $students->count(), 'icon' => 'users'],
                ['label' => 'New Students', 'value' => $newStudents->count(), 'hint' => $this->pct($newStudents->count(), $students->count()), 'icon' => 'user'],
                ['label' => 'Returning Students', 'value' => $students->count() - $newStudents->count(), 'icon' => 'repeat'],
                ['label' => 'Programs with Students', 'value' => $table->where('total', '>', 0)->count(), 'icon' => 'list'],
                ['label' => 'Dropped / Not Enrolled', 'value' => $dropped, 'icon' => 'x'],
            ],
            'charts' => [
                ['title' => 'Enrollment Trend', 'subtitle' => 'Students per term (every school year and semester)', 'type' => 'line', 'data' => $trend, 'wide' => true],
                ['title' => 'Students per Program', 'type' => 'bar', 'data' => $table->where('total', '>', 0)->sortByDesc('total')->map(fn ($r) => ['label' => $r['program'], 'value' => $r['total']])->values()->all()],
                ['title' => 'Students by Year Level', 'type' => 'bar', 'data' => $rows->isEmpty() ? [] : collect([1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'])
                    ->map(fn ($l, $k) => ['label' => $l, 'value' => (int) ($levelCounts[$k] ?? 0)])->values()->all()],
                ['title' => 'New vs Returning', 'type' => 'doughnut', 'data' => array_values(array_filter([
                    ['label' => 'New', 'value' => $newStudents->count(), 'color' => '#22c55e'],
                    ['label' => 'Returning', 'value' => $students->count() - $newStudents->count(), 'color' => '#3b82f6'],
                ], fn ($d) => $d['value'] > 0))],
                ['title' => 'Students by Sex', 'type' => 'doughnut', 'data' => array_values(array_filter([
                    ['label' => 'Male', 'value' => (int) ($sexCounts['m'] ?? 0), 'color' => '#3b82f6'],
                    ['label' => 'Female', 'value' => (int) ($sexCounts['f'] ?? 0), 'color' => '#ec4899'],
                    ['label' => 'Not set', 'value' => (int) ($sexCounts['u'] ?? 0), 'color' => '#9ca3af'],
                ], fn ($d) => $d['value'] > 0))],
            ],
            'table' => [
                'columns' => [
                    ['field' => 'program', 'label' => 'Program'], ['field' => 'name', 'label' => 'Program Name'],
                    ['field' => 'year1', 'label' => '1st Year'], ['field' => 'year2', 'label' => '2nd Year'], ['field' => 'year3', 'label' => '3rd Year'],
                    ['field' => 'year4', 'label' => '4th Year'], ['field' => 'new', 'label' => 'New'], ['field' => 'total', 'label' => 'Total'],
                ],
                'rows' => $table->values()->all(),
            ],
        ];
    }

    /** Individual enrollment report: one student's terms, program and year level. */
    private function studentEnrollment(int $studentId): array
    {
        $years = SchoolYear::pluck('year', 'id');
        $rows = Enrollment::with('program:id,code,name')->where('student_id', $studentId)->get()
            ->sortBy(fn ($e) => ($years[$e->school_year_id] ?? '').'-'.$e->semester)->values()
            ->map(fn ($e, $i) => [
                'id' => $e->id,
                'term' => 'SY '.($years[$e->school_year_id] ?? '?').' · '.($e->semester == 1 ? '1st' : '2nd').' Semester',
                'program' => $e->program?->code,
                'name' => $e->program?->name,
                'year_level' => [1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'][$e->year_level] ?? '—',
                'status' => ucfirst((string) $e->status),
                'dropped' => $this->fmt($e->dropped_at, false),
            ]);
        $latest = $rows->last();

        return [
            'period' => 'All terms',
            'filter' => ['school_year' => 'all', 'semester' => 'all'],
            'cards' => [
                ['label' => 'Terms Enrolled', 'value' => $rows->where('status', 'Enrolled')->count(), 'icon' => 'calendar'],
                ['label' => 'Current Program', 'value' => $latest['program'] ?? '—', 'icon' => 'list'],
                ['label' => 'Current Year Level', 'value' => $latest['year_level'] ?? '—', 'icon' => 'user'],
                ['label' => 'Programs Taken', 'value' => $rows->pluck('program')->filter()->unique()->count(), 'icon' => 'repeat'],
                ['label' => 'Dropped / Not Enrolled', 'value' => $rows->where('status', '!=', 'Enrolled')->count(), 'icon' => 'x'],
            ],
            'charts' => [],
            'table' => [
                'columns' => [
                    ['field' => 'term', 'label' => 'Term'], ['field' => 'program', 'label' => 'Program'], ['field' => 'name', 'label' => 'Program Name'],
                    ['field' => 'year_level', 'label' => 'Year Level'], ['field' => 'status', 'label' => 'Status'], ['field' => 'dropped', 'label' => 'Dropped On'],
                ],
                'rows' => $rows->all(),
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Generated Reports
    // ------------------------------------------------------------------

    private function generatedReports(): array
    {
        $rows = Report::where('user_id', auth()->id())->latest('created_at')->get()->map(fn (Report $r) => [
            'id' => $r->id,
            'name' => $r->report_name ?: $r->readableFileName(),
            'file_name' => $r->readableFileName(),
            'report_type' => $r->report_type,
            'type_label' => self::REPORT_TYPES[$r->report_type] ?? ucwords(str_replace('_', ' ', (string) $r->report_type)),
            'summary' => isset(self::REPORT_TYPES[$r->report_type]) ? $this->filterSummary($r->report_type, $r->filters ?? []) : null,
            'individual' => self::individualId($r->filters ?? []) !== null,
            'file_type' => $r->file_type,
            'school_year' => $r->filters['school_year'] ?? null,
            'semester' => isset($r->filters['semester']) ? (string) $r->filters['semester'] : null,
            'created' => $this->fmt($r->created_at),
            'download_url' => route('super-admin.report.download', ['id' => encrypt_id($r->id)], false),
            'view_url' => $r->file_type === 'pdf' ? route('super-admin.report.view', ['id' => encrypt_id($r->id)], false) : null,
        ]);

        return ['period' => null, 'cards' => [], 'charts' => [], 'table' => ['columns' => [], 'rows' => $rows->all()]];
    }
}
