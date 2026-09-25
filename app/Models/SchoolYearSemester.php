<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class SchoolYearSemester extends Model
{
    protected $table = 'school_year_semester';

    protected $fillable = ['school_year_id', 'semester', 'date_start', 'date_end', 'notified_at'];

    protected function casts(): array
    {
        return [
            'date_start' => 'date',
            'date_end' => 'date',
            'notified_at' => 'datetime',
        ];
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    /**
     * The semester of the currently active school year whose date range
     * covers today — replaces the old is_active flag (which had to be
     * toggled by hand and could drift from the actual calendar).
     */
    public static function current(): ?self
    {
        $today = now()->toDateString();

        return self::whereHas('schoolYear', fn ($q) => $q->where('activate', true))
            ->whereDate('date_start', '<=', $today)
            ->whereDate('date_end', '>=', $today)
            ->first();
    }

    public static function currentId(): ?int
    {
        return self::current()?->id;
    }

    /**
     * Resolves the semester whose date range a given date falls into. Used
     * to backdate seeded requests to the semester that was actually running
     * when their (randomly backdated) created_at happened, instead of
     * stamping every seeded row with today's semester.
     */
    public static function idForDate($date): ?int
    {
        $date = Carbon::parse($date)->toDateString();

        return self::whereDate('date_start', '<=', $date)
            ->whereDate('date_end', '>=', $date)
            ->value('id');
    }

    /**
     * Default Aug-Jul academic-year date range for a semester (1st: Aug-Dec,
     * 2nd: Jan-Jul of the following year) — prefills a school year's
     * semesters when it's created/seeded. An admin can adjust either date
     * afterward via SchoolYearController::updateSemesterDates().
     */
    public static function defaultDateRange(int $startYear, int $semester): array
    {
        return $semester === 1
            ? [Carbon::create($startYear, 8, 1), Carbon::create($startYear, 12, 31)]
            : [Carbon::create($startYear + 1, 1, 1), Carbon::create($startYear + 1, 7, 31)];
    }
}
