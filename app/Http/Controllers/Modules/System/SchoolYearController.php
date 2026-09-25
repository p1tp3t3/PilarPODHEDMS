<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use App\Http\Requests\SchoolYear\StoreSchoolYearRequest;
use App\Models\Enrollment;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SchoolYearController extends Controller
{
    public function index()
    {
        return Inertia::render('itrc/school-year', [
            'user' => auth()->user(),
            'school_years' => self::listWithCounts(),
        ]);
    }

    /**
     * enrollments_count lets the frontend disable Delete (with a tooltip)
     * for a school year that's still in use, instead of only finding out
     * after confirming and hitting the 409 from destroy() below.
     */
    private static function listWithCounts()
    {
        return SchoolYear::withCount('enrollments')
            ->with('semesters')
            ->orderByDesc('activate')
            ->orderByDesc('year')
            ->get();
    }

    public function store(StoreSchoolYearRequest $request)
    {
        $schoolYear = SchoolYear::create([
            'year' => $request->year,
            'activate' => false,
        ]);

        // Prefilled with the standard Aug-Jul academic calendar — an admin
        // can adjust either semester's dates afterward via
        // updateSemesterDates() if this school's calendar differs.
        $startYear = (int) explode('-', $request->year)[0];
        foreach ([1, 2] as $semester) {
            [$dateStart, $dateEnd] = SchoolYearSemester::defaultDateRange($startYear, $semester);
            $schoolYear->semesters()->create([
                'semester' => $semester,
                'date_start' => $dateStart,
                'date_end' => $dateEnd,
            ]);
        }

        return self::listWithCounts();
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
        // make SchoolYearSemester::current()/idForDate() match more than
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

        return self::listWithCounts();
    }

    public function activate(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:school_year,id',
        ]);

        DB::transaction(function () use ($request) {
            SchoolYear::query()->update(['activate' => false]);
            SchoolYear::where('id', $request->id)->update(['activate' => true]);
        });

        return self::listWithCounts();
    }

    public function close(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:school_year,id',
        ]);

        SchoolYear::where('id', $request->id)->update(['activate' => false]);

        return self::listWithCounts();
    }

    public function destroy(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:school_year,id',
        ]);

        $schoolYear = SchoolYear::find($request->id);

        if ($schoolYear->activate) {
            return response()->json([
                'message' => 'This is the currently active school year — activate a different one before deleting it.',
            ], 409);
        }

        if (Enrollment::where('school_year_id', $request->id)->exists()) {
            return response()->json([
                'message' => 'This school year cannot be deleted. Students are still enrolled under it.',
            ], 409);
        }

        $schoolYear->delete();

        return self::listWithCounts();
    }
}
