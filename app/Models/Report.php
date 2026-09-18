<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    public $fillable = ['user_id', 'report_name', 'report_type', 'file_type', 'filters', 'filters_hash'],
           $table = 'report',
           $timestamps = false;

    protected $casts = [
        'filters' => 'array',
    ];

    public function user()
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

        return md5($reportType . '|' . $fileType . '|' . json_encode($relevant));
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

        if (!preg_match('/^(\d{4})-(\d{4})$/', $filters['school_year'], $m)) {
            return $filters;
        }

        $filters['date_from'] = "{$m[1]}-06-01";
        $filters['date_to'] = "{$m[2]}-05-31 23:59:59";

        return $filters;
    }
}
