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

        // Every school year starts at its 1st semester.
        $schoolYear->semesters()->createMany([
            ['semester' => 1, 'is_active' => true],
            ['semester' => 2, 'is_active' => false],
        ]);

        return self::listWithCounts();
    }

    public function activateSemester(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:school_year_semester,id',
        ]);

        $semester = SchoolYearSemester::findOrFail($request->id);

        DB::transaction(function () use ($semester) {
            SchoolYearSemester::where('school_year_id', $semester->school_year_id)->update(['is_active' => false]);
            $semester->update(['is_active' => true]);
        });

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
