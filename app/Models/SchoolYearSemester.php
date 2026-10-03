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
     * Every semester ever defined, cached for the lifetime of the request —
     * there are only ever a handful of these (a couple per school year), so
     * resolving "which semester does this date fall into" in-memory against
     * this list is cheap and avoids a DB round-trip per record whenever a
     * list of complaints/referrals/etc. derives its semester tag from its
     * own date (see forDate() below).
     */
    protected static ?\Illuminate\Support\Collection $allCached = null;

    public static function allCached(): \Illuminate\Support\Collection
    {
        return self::$allCached ??= self::with('schoolYear')->get();
    }

    public static function flushCache(): void
    {
        self::$allCached = null;
    }

    /**
     * The semester whose date range covers today — purely date-driven, no
     * manual "activate" flag to drift out of sync with the actual calendar.
     */
    public static function current(): ?self
    {
        return self::forDate(now());
    }

    public static function currentId(): ?int
    {
        return self::current()?->id;
    }

    /**
     * Resolves the semester whose date range a given date falls into —
     * used both to derive a record's "effective" semester from its own
     * timestamp (created_at/confirmed_at/etc, instead of a stored FK) and
     * to backdate seeded requests to the semester that was actually running
     * when their (randomly backdated) created_at happened.
     */
    public static function forDate($date): ?self
    {
        if (! $date) {
            return null;
        }

        $date = Carbon::parse($date)->toDateString();

        return self::allCached()->first(
            fn (self $s) => $s->date_start && $s->date_end
                && $date >= $s->date_start->toDateString()
                && $date <= $s->date_end->toDateString()
        );
    }

    public static function idForDate($date): ?int
    {
        return self::forDate($date)?->id;
    }

    /**
     * Applies a "school year" / "semester" filter dropdown pair to a query
     * by date range on the given date column — replaces the old
     * whereHas('schoolYearSemester', ...) filtering that depended on a
     * stored FK. Matches the old filter's semantics: filtering by school
     * year alone matches either of its semesters, filtering by semester
     * alone matches that semester number across every school year, and
     * both together narrow to that one specific semester.
     */
    public static function applyFilter($query, string $dateColumn, $schoolYear = null, $semester = null): void
    {
        $hasYearFilter = $schoolYear && $schoolYear !== 'all';
        $hasSemesterFilter = $semester && $semester !== 'all';

        if (! $hasYearFilter && ! $hasSemesterFilter) {
            return;
        }

        $matches = self::allCached()->filter(function (self $s) use ($hasYearFilter, $schoolYear, $hasSemesterFilter, $semester) {
            if (! $s->date_start || ! $s->date_end) {
                return false;
            }
            if ($hasYearFilter && $s->schoolYear?->year !== $schoolYear) {
                return false;
            }
            if ($hasSemesterFilter && (string) $s->semester !== (string) $semester) {
                return false;
            }

            return true;
        });

        if ($matches->isEmpty()) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function ($q) use ($matches, $dateColumn) {
            foreach ($matches as $s) {
                $q->orWhereBetween($dateColumn, [$s->date_start->startOfDay(), $s->date_end->endOfDay()]);
            }
        });
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
