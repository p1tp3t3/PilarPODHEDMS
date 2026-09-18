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
}
