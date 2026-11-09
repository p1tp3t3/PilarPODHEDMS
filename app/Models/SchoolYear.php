<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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
     * semester dates and the day it gets added (the day after the latest
     * school year's 2nd semester ends — which is also when its 1st
     * semester starts). Its 2nd semester starts the day after the 1st
     * ends. The two end dates are the defaults unless planned ahead
     * (upcoming_school_year_dates). With no school years at all, it's the
     * one covering today, added immediately.
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

        $year = $startYear.'-'.($startYear + 1);
        $planned = DB::table('upcoming_school_year_dates')->where('year', $year)->first();

        [$start1, $end1] = SchoolYearSemester::defaultDateRange($startYear, 1);
        [, $end2] = SchoolYearSemester::defaultDateRange($startYear, 2);
        if ($planned) {
            $end1 = Carbon::parse($planned->first_sem_end);
            $end2 = Carbon::parse($planned->second_sem_end);
        }
        // Back to back: 1st Sem right after the latest school year, 2nd Sem
        // right after the 1st.
        if ($latest) {
            $start1 = $addsOn->copy();
        }
        if ($start1->gte($end1)) {
            $end1 = $start1->copy()->addMonths(4)->endOfMonth();
        }
        $start2 = $end1->copy()->addDay();
        if ($start2->gte($end2)) {
            $end2 = $start2->copy()->addMonths(6)->endOfMonth();
        }

        return [
            'year' => $year,
            'adds_on' => $addsOn->toDateString(),
            'after_year' => $latest?->year,
            'planned' => (bool) $planned,
            'semesters' => [
                ['semester' => 1, 'date_start' => $start1->toDateString(), 'date_end' => $end1->toDateString()],
                ['semester' => 2, 'date_start' => $start2->toDateString(), 'date_end' => $end2->toDateString()],
            ],
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
            // Its planned dates are now its real ones.
            DB::table('upcoming_school_year_dates')->where('year', $next['year'])->delete();
            $created[] = $schoolYear;
        }

        if ($created) {
            SchoolYearSemester::flushCache();
        }

        return $created;
    }
}
