<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use App\Support\BreachLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SecurityMonitorController extends Controller
{
    public function index()
    {
        return Inertia::render('super-admin/security-monitor', [
            'entries' => BreachLog::entries(),
            'types' => collect(BreachLog::TYPES)->map(fn ($label, $val) => ['val' => $val, 'label' => $label])->values(),
            'school_years' => SchoolYear::with('semesters:id,school_year_id,semester,date_start,date_end')
                ->orderByDesc('year')->get(['id', 'year']),
        ]);
    }

    public function pdf(Request $request)
    {
        $f = $request->only(['type', 'severity', 'filter_by', 'date_from', 'date_to', 'school_year_id', 'semester', 'search']);
        $entries = self::filter(BreachLog::entries(), $f);

        $parts = [];
        if (! empty($f['type']) && $f['type'] !== 'all') {
            $parts[] = BreachLog::TYPES[$f['type']] ?? $f['type'];
        }
        if (! empty($f['severity']) && $f['severity'] !== 'all') {
            $parts[] = ucfirst($f['severity']).' severity';
        }
        if (($f['filter_by'] ?? 'date') === 'school_year') {
            $year = ! empty($f['school_year_id']) && $f['school_year_id'] !== 'all'
                ? 'School Year '.SchoolYear::where('id', $f['school_year_id'])->value('year')
                : 'All School Years';
            $sem = match ((int) ($f['semester'] ?? 0)) {
                1 => '1st Semester',
                2 => '2nd Semester',
                default => 'All Semesters',
            };
            $parts[] = "{$year} · {$sem}";
        } else {
            $from = ! empty($f['date_from']) ? Carbon::parse($f['date_from'])->format('F j, Y') : null;
            $to = ! empty($f['date_to']) ? Carbon::parse($f['date_to'])->format('F j, Y') : null;
            $parts[] = match (true) {
                $from && $to => "{$from} – {$to}",
                (bool) $from => "From {$from}",
                (bool) $to => "Until {$to}",
                default => 'All Dates',
            };
        }
        if (! empty($f['search'])) {
            $parts[] = 'Search: "'.$f['search'].'"';
        }

        $pdf = Pdf::loadView('pdf.reports.security-log-report', [
            'entries' => $entries,
            'period' => implode(' · ', $parts),
            'summary' => [
                'total' => count($entries),
                'high' => count(array_filter($entries, fn ($e) => $e['severity'] === 'high')),
                'medium' => count(array_filter($entries, fn ($e) => $e['severity'] === 'medium')),
                'low' => count(array_filter($entries, fn ($e) => $e['severity'] === 'low')),
                'ips' => count(array_unique(array_filter(array_column($entries, 'ip')))),
            ],
        ])->setPaper('a4', 'landscape');

        return $pdf->stream('security-log-'.now()->format('Ymd-His').'.pdf');
    }

    private static function filter(array $entries, array $f): array
    {
        $search = strtolower(trim($f['search'] ?? ''));
        $bySchoolYear = ($f['filter_by'] ?? 'date') === 'school_year';

        $ranges = null;
        $oneYear = ! empty($f['school_year_id']) && $f['school_year_id'] !== 'all';
        if ($bySchoolYear && ($oneYear || ! empty($f['semester']))) {
            $ranges = SchoolYearSemester::allCached()
                ->filter(fn ($s) => $s->date_start && $s->date_end
                    && (! $oneYear || (string) $s->school_year_id === (string) $f['school_year_id'])
                    && (empty($f['semester']) || (string) $s->semester === (string) $f['semester']))
                ->map(fn ($s) => [$s->date_start->toDateString(), $s->date_end->toDateString()])
                ->values()->all();
        }

        return array_values(array_filter($entries, function ($e) use ($f, $search, $bySchoolYear, $ranges) {
            if (! empty($f['type']) && $f['type'] !== 'all' && $e['type'] !== $f['type']) {
                return false;
            }
            if (! empty($f['severity']) && $f['severity'] !== 'all' && $e['severity'] !== $f['severity']) {
                return false;
            }
            $day = substr($e['datetime'], 0, 10);
            if (! $bySchoolYear) {
                if (! empty($f['date_from']) && $day < $f['date_from']) {
                    return false;
                }
                if (! empty($f['date_to']) && $day > $f['date_to']) {
                    return false;
                }
            } elseif ($ranges !== null) {
                $inside = false;
                foreach ($ranges as [$start, $end]) {
                    if ($day >= $start && $day <= $end) {
                        $inside = true;
                        break;
                    }
                }
                if (! $inside) {
                    return false;
                }
            }
            if ($search !== '') {
                $hay = strtolower(implode(' ', [$e['datetime'], $e['severity'], $e['message'], $e['type_label'], $e['ip'], $e['username'] ?? 'guest', $e['role'], $e['url']]));
                foreach (preg_split('/\s+/', $search) as $word) {
                    if (! str_contains($hay, $word)) {
                        return false;
                    }
                }
            }

            return true;
        }));
    }
}
