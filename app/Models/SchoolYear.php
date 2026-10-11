<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class SchoolYear extends Model
{
    use HasFactory;

    protected $table = 'school_year';

    protected $fillable = ['year'];

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'school_year_id', 'id');
    }

    public function semesters(): HasMany
    {
        return $this->hasMany(SchoolYearSemester::class, 'school_year_id')->orderBy('semester');
    }

    /**
     * Whether this is the active school year — see SchoolYearSemester::current()
     * for how the active semester carries across gaps between semesters.
     */
    public function isCurrent(): bool
    {
        return SchoolYearSemester::current()?->school_year_id === $this->id;
    }

    /**
     * The school year that comes after the latest one on record, with its
     * default semester dates and the day it gets added (the day after the
     * latest school year's 2nd semester ends). With no school years at
     * all, it's the one covering today, added immediately.
     */
    public static function upcoming(): array
    {
        $latest = static::with('semesters')->orderByDesc('year')->first();

        if ($latest) {
            $startYear = (int) explode('-', $latest->year)[0] + 1;
            // Added only once the latest school year's 2nd semester is over.
            $secondSemEnd = $latest->semesters->firstWhere('semester', 2)?->date_end
                ?? $latest->semesters->max('date_end');
            $addsOn = $secondSemEnd ? Carbon::parse($secondSemEnd)->addDay() : today();
        } else {
            $startYear = today()->month >= 8 ? today()->year : today()->year - 1;
            $addsOn = today();
        }

        return [
            'year' => $startYear.'-'.($startYear + 1),
            'adds_on' => $addsOn->toDateString(),
            'after_year' => $latest?->year,
            'semesters' => collect([1, 2])->map(function ($n) use ($startYear) {
                [$start, $end] = SchoolYearSemester::defaultDateRange($startYear, $n);

                return ['semester' => $n, 'date_start' => $start->toDateString(), 'date_end' => $end->toDateString()];
            })->all(),
        ];
    }

    /**
     * Adds the upcoming school year once the current one has ended. Loops so
     * a scheduler that hasn't run for a while still catches up one school
     * year at a time. Returns the school years it created.
     */
    public static function createUpcomingIfDue(): array
    {
        $created = [];

        for ($i = 0; $i < 5; $i++) {
            $next = static::upcoming();
            if (Carbon::parse($next['adds_on'])->isAfter(today()) || static::where('year', $next['year'])->exists()) {
                break;
            }

            $schoolYear = static::create(['year' => $next['year']]);
            foreach ($next['semesters'] as $s) {
                $schoolYear->semesters()->create($s);
            }
            $created[] = $schoolYear;
        }

        if ($created) {
            SchoolYearSemester::flushCache();
        }

        return $created;
    }
}
