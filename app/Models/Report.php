<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    protected $fillable = ['user_id', 'report_name', 'report_type', 'file_type', 'filters', 'filters_hash'];

    protected $table = 'report';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'filters' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * Normalized hash used to detect "you already generated this" —
     * excludes report_name/type (display-only, don't affect the result)
     * and normalizes key order so the same filters always hash the same.
     */
    public static function hashFilters(string $reportType, string $fileType, array $filters): string
    {
        $relevant = [
            'individual' => filter_var($filters['individual'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'student_id' => $filters['student_id'] ?? null,
            'program' => $filters['program'] ?? null,
            'report_type' => $filters['report_type'] ?? null,
            'school_year' => $filters['school_year'] ?? null,
            // Only meaningful with a school year (blank = the whole year).
            'semester' => ! empty($filters['school_year']) && ! empty($filters['semester']) ? (int) $filters['semester'] : null,
            'date_from' => $filters['date_from'] ?? null,
            'date_to' => $filters['date_to'] ?? null,
        ];

        ksort($relevant);

        return md5($reportType.'|'.$fileType.'|'.json_encode($relevant));
    }

    /**
     * "Generate by school year" resolves to a fixed calendar span derived
     * from the "YYYY-YYYY" label itself (June 1 of the first year through
     * May 31 of the second), so the existing date_from/date_to-based
     * filtering in GenerateReportJob doesn't need to change.
     *
     * This used to derive the span from enrollment records instead
     * (MIN(enrolled_at) to MAX(dropped_at)), but that's fragile — a
     * student's own enrollment row is often dated well after the school
     * year actually started, so incidents from earlier in that same year
     * were silently excluded from their report.
     */
    public static function resolveSchoolYearDates(array $filters): array
    {
        if (empty($filters['school_year'])) {
            return $filters;
        }

        if (! preg_match('/^(\d{4})-(\d{4})$/', $filters['school_year'], $m)) {
            return $filters;
        }

        $filters['date_from'] = "{$m[1]}-06-01";
        $filters['date_to'] = "{$m[2]}-05-31 23:59:59";

        // Optional narrowing to one semester — same Aug-Dec/Jan-Jul academic
        // year convention as SchoolYearSemester::idForDate(). Only applied
        // when a semester is actually given, so every existing caller that
        // never passes one (Archive page, other report types) keeps the
        // full Jun-May span unchanged.
        if (! empty($filters['semester'])) {
            $filters['date_from'] = (int) $filters['semester'] === 1
                ? "{$m[1]}-08-01"
                : "{$m[2]}-01-01";
            $filters['date_to'] = (int) $filters['semester'] === 1
                ? "{$m[1]}-12-31 23:59:59"
                : "{$m[2]}-07-31 23:59:59";
        }

        return $filters;
    }

    /**
     * The name a generated file is downloaded / viewed under (the file on
     * disk stays {id}-{type}-report.{ext}). A group report:
     *   "Incident Report - All Programs - SY 2025-2026, 1st Semester.pdf"
     * An individual report (one student):
     *   "Analytical Report - Juan Dela Cruz (2025-00001) - All Time.pdf"
     */
    public function readableFileName(): string
    {
        ['type' => $type, 'scope' => $scope, 'period' => $period] = $this->readableParts();

        $ext = ['excel' => 'xlsx', 'word' => 'docx'][$this->file_type] ?? 'pdf';
        // No characters a file name can't hold.
        $name = trim(preg_replace('/[\\\\\/:*?"<>|]+/', '-', implode(' - ', array_filter([$type, ...$scope, $period]))));

        return "{$name}.{$ext}";
    }

    /**
     * What the report is, in words: type ("Incident Report"), scope (the
     * student, or the incident / violation and program), period ("SY
     * 2025-2026, 1st Semester"), and the student (individual reports). Used
     * by the file name and the spreadsheet's heading.
     */
    public function readableParts(): array
    {
        $f = $this->filters ?? [];
        $type = [
            'incident' => 'Incident Report', 'violation' => 'Violation Report', 'tardy' => 'Tardy Report',
            'appointment' => 'Appointment Report', 'gatepass' => 'Gate Pass Report', 'analytics' => 'Analytical Report',
        ][$this->report_type] ?? ucwords(str_replace(['-', '_'], ' ', (string) $this->report_type)).' Report';

        // The period.
        $sem = [1 => '1st Semester', 2 => '2nd Semester'][(int) ($f['semester'] ?? 0)] ?? null;
        if (! empty($f['school_year'])) {
            $period = ($f['school_year'] === 'all' ? 'All School Years' : "SY {$f['school_year']}").($sem ? ", {$sem}" : '');
        } elseif (! empty($f['date_from']) && ! empty($f['date_to']) && ! str_starts_with((string) $f['date_from'], '2000-01-01')) {
            $period = \Carbon\Carbon::parse($f['date_from'])->format('M j, Y').' to '.\Carbon\Carbon::parse($f['date_to'])->format('M j, Y');
        } else {
            $period = 'All Time';
        }

        $parts = [];
        $student = null;
        $individual = filter_var($f['individual'] ?? false, FILTER_VALIDATE_BOOLEAN) && ! empty($f['student_id']);
        if ($individual) {
            // Who it's about.
            $student = User::with(['profile', 'program', 'enrollments'])->find($f['student_id']);
            $p = $student?->profile;
            $name = trim(preg_replace('/\s+/', ' ', ($p->first_name ?? '').' '.($p->middle_name ?? '').' '.($p->last_name ?? '')));
            $parts[] = trim(($name ?: 'Student').($student?->id_number ? " ({$student->id_number})" : ''));
        } else {
            // Which incident / violation, and which program (group reports).
            if (in_array($this->report_type, ['incident', 'violation']) && ! empty($f['report_type']) && $f['report_type'] !== 'all') {
                $parts[] = ucwords(strtolower((string) Violation::whereKey($f['report_type'])->value('violation_name')));
            }
            if (in_array($this->report_type, ['incident', 'violation', 'tardy', 'appointment', 'gatepass'])) {
                $parts[] = ! empty($f['program']) && $f['program'] !== 'all'
                    ? (Program::whereKey($f['program'])->value('code') ?? 'Program')
                    : 'All Programs';
            }
        }

        return ['type' => $type, 'scope' => array_values(array_filter($parts)), 'period' => $period, 'student' => $student];
    }
}
