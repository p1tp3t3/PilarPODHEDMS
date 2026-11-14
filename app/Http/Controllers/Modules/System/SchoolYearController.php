<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Http\Resources\System\SchoolYearResource;

class SchoolYearController extends Controller
{
    public function index()
    {
        // Fallback for when the scheduler isn't running: opening this page
        // also adds the next school year if the current one has ended.
        SchoolYear::createUpcomingIfDue();

        return Inertia::render('super-admin/school-year', [
            'school_years' => self::listWithCounts(),
            'upcoming' => SchoolYear::upcoming(),
        ]);
    }

    /**
     * enrollments_count lets the frontend disable Delete (with a tooltip)
     * for a school year that's still in use, instead of only finding out
     * after confirming and hitting the 409 from destroy() below.
     */
    private static function listWithCounts()
    {
        SchoolYearSemester::flushCache();
        $currentId = SchoolYearSemester::currentId();
        $currentYear = self::currentYear();

        return SchoolYear::withCount('enrollments')
            ->with('semesters')
            ->orderByDesc('year')
            ->get()
            ->each(function ($sy) use ($currentId, $currentYear) {
                $sy->is_current = $sy->semesters->contains('id', $currentId);
                // A school year before the current one has ended: read-only.
                $sy->is_past = self::isPastYear($sy->year, $currentYear);
                $sy->semesters->each(function ($s) use ($currentId) {
                    $s->is_current = $s->id === $currentId;
                    // Starts the day after a past school year ended, so it's fixed.
                    $previous = self::neighbours($s)[0];
                    $s->start_locked = $previous && self::isPastYear($previous->schoolYear->year, self::currentYear());
                });
            })
            ->pipe(fn ($years) => SchoolYearResource::collection($years));
    }

    /** The current school year's "YYYY-YYYY" (null if none is on record). */
    private static function currentYear(): ?string
    {
        return SchoolYearSemester::current()?->schoolYear?->year;
    }

    private static function isPastYear(string $year, ?string $currentYear): bool
    {
        return $currentYear !== null && strcmp($year, $currentYear) < 0;
    }

    public function updateSemesterDates(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:school_year_semester,id',
            'date_start' => 'required|date',
            'date_end' => 'required|date|after:date_start',
        ]);

        $semester = SchoolYearSemester::findOrFail($request->id);
        $start = Carbon::parse($request->date_start)->startOfDay();
        $end = Carbon::parse($request->date_end)->startOfDay();

        // Semesters run back to back: the one before ends the day before
        // this one starts, and the one after starts the day after this one
        // ends (across school years too: 2nd Sem -> next 1st Sem). The
        // upcoming school year, not stored yet, follows on its own: it
        // starts the day after the latest 2nd Sem ends (SchoolYear::upcoming()).
        [$previous, $next] = self::neighbours($semester);
        $label = fn ($s) => ($s->semester === 1 ? '1st' : '2nd').' Sem of SY '.$s->schoolYear->year;

        // Past school years are read-only, and so is the day the school
        // year after one starts (it follows the past one's end).
        $currentYear = self::currentYear();
        $semester->loadMissing('schoolYear');
        if (self::isPastYear($semester->schoolYear->year, $currentYear)) {
            return response()->json([
                'message' => 'SY '.$semester->schoolYear->year.' has ended, so its dates can\'t be edited anymore.',
            ], 422);
        }
        if ($previous && self::isPastYear($previous->schoolYear->year, $currentYear)
            && $start->toDateString() !== $semester->date_start->toDateString()) {
            return response()->json([
                'message' => 'This semester starts the day after SY '.$previous->schoolYear->year.' ended, which can\'t be edited anymore, so its start date is fixed.',
            ], 422);
        }

        if ($previous && $start->copy()->subDay()->lt($previous->date_start)) {
            return response()->json([
                'message' => 'This start is too early: the '.$label($previous).' would end before it starts ('.$previous->date_start->toDateString().').',
            ], 422);
        }
        if ($next && $end->copy()->addDay()->gt($next->date_end)) {
            return response()->json([
                'message' => 'This end is too late: the '.$label($next).' would start after it ends ('.$next->date_end->toDateString().').',
            ], 422);
        }
        // The latest school year's 2nd Sem: the upcoming school year's 1st
        // Sem starts the day after, so it must still end after that.
        if (! $next && $semester->semester === 2) {
            $upcomingEnd = SchoolYear::upcoming()['semesters'][0]['date_end'];
            if ($end->copy()->addDay()->toDateString() >= $upcomingEnd) {
                return response()->json([
                    'message' => 'This end is too late: the upcoming school year\'s 1st Sem would start after it ends ('.$upcomingEnd.').',
                ], 422);
            }
        }

        DB::transaction(function () use ($semester, $previous, $next, $start, $end) {
            $semester->update(['date_start' => $start->toDateString(), 'date_end' => $end->toDateString()]);
            $previous?->update(['date_end' => $start->copy()->subDay()->toDateString()]);
            $next?->update(['date_start' => $end->copy()->addDay()->toDateString()]);
        });

        SchoolYearSemester::flushCache();

        return self::listWithCounts();
    }

    /**
     * Plans the upcoming school year's dates before it's added. Its 1st Sem
     * start is fixed (the day after the latest school year ends); changing
     * the 1st Sem end moves the 2nd Sem start, and the 2nd Sem start moves
     * the 1st Sem end.
     */
    public function updateUpcomingDates(Request $request)
    {
        $request->validate([
            'semester' => 'required|in:1,2',
            'date_start' => 'required|date',
            'date_end' => 'required|date|after:date_start',
        ]);

        $upcoming = SchoolYear::upcoming();
        [$first, $second] = $upcoming['semesters'];
        $start = Carbon::parse($request->date_start)->toDateString();
        $end = Carbon::parse($request->date_end)->toDateString();

        if ((int) $request->semester === 1) {
            if ($start !== $first['date_start']) {
                return response()->json(['message' => 'The 1st Sem starts the day after SY '.($upcoming['after_year'] ?? '').' ends, so its start is fixed here.'], 422);
            }
            if (Carbon::parse($end)->addDay()->toDateString() >= $second['date_end']) {
                return response()->json(['message' => 'This end is too late: the 2nd Sem would start after it ends ('.$second['date_end'].').'], 422);
            }
            $firstEnd = $end;
            $secondEnd = $second['date_end'];
        } else {
            $firstEnd = Carbon::parse($start)->subDay()->toDateString();
            if ($firstEnd <= $first['date_start']) {
                return response()->json(['message' => 'This start is too early: the 1st Sem would end before it starts ('.$first['date_start'].').'], 422);
            }
            $secondEnd = $end;
        }

        DB::table('upcoming_school_year_dates')->updateOrInsert(
            ['year' => $upcoming['year']],
            ['first_sem_end' => $firstEnd, 'second_sem_end' => $secondEnd, 'updated_at' => now(), 'created_at' => now()]
        );

        return self::listWithCounts();
    }

    /** The semesters just before and just after this one, across school years. */
    private static function neighbours(SchoolYearSemester $semester): array
    {
        $ordered = SchoolYearSemester::with('schoolYear')->get()
            ->sortBy(fn ($s) => $s->schoolYear->year.'-'.$s->semester)
            ->values();
        $i = $ordered->search(fn ($s) => $s->id === $semester->id);

        return [$ordered->get($i - 1), $ordered->get($i + 1)];
    }
}
