<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SchoolYearController extends Controller
{
    public function index()
    {
        // Fallback for when the scheduler isn't running: opening this page
        // also adds the next school year if the current one has ended.
        SchoolYear::createUpcomingIfDue();

        return Inertia::render('itrc/school-year', [
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

        return SchoolYear::withCount('enrollments')
            ->with('semesters')
            ->orderByDesc('year')
            ->get()
            ->each(function ($sy) use ($currentId) {
                $sy->is_current = $sy->semesters->contains('id', $currentId);
                $sy->semesters->each(fn ($s) => $s->is_current = $s->id === $currentId);
            });
    }

    public function updateSemesterDates(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:school_year_semester,id',
            'date_start' => 'required|date',
            'date_end' => 'required|date|after:date_start',
        ]);

        $semester = SchoolYearSemester::findOrFail($request->id);

        // A gap between semesters is fine, but overlapping ranges would
        // make SchoolYearSemester::current()/forDate() match more than
        // one semester for the same date — silently picking whichever one
        // the query happens to return first.
        $overlaps = SchoolYearSemester::where('school_year_id', $semester->school_year_id)
            ->where('id', '!=', $semester->id)
            ->whereDate('date_start', '<=', $request->date_end)
            ->whereDate('date_end', '>=', $request->date_start)
            ->exists();

        if ($overlaps) {
            return response()->json([
                'message' => 'This date range overlaps with the other semester of this school year.',
            ], 422);
        }

        $semester->update([
            'date_start' => $request->date_start,
            'date_end' => $request->date_end,
        ]);

        SchoolYearSemester::flushCache();

        return self::listWithCounts();
    }
}
