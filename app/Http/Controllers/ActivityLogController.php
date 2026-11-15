<?php

namespace App\Http\Controllers;

use App\Http\Resources\Report\ActionLogResource;
use App\Models\ActionLog;
use Inertia\Inertia;

/**
 * "My Activity": every user's own action log — only their own entries,
 * never anyone else's (the full log stays the System Admin's report).
 */
class ActivityLogController extends Controller
{
    public function index()
    {
        $query = ActionLog::with('user.profile')
            ->where('user_id', auth()->id())
            ->latest('created_at');

        if (request('action_type') && request('action_type') !== 'all') {
            $query->where('action_type', request('action_type'));
        }

        // School year / semester: the semesters' date ranges (a semester with
        // "All School Years" is that semester of every year).
        \App\Models\SchoolYearSemester::applyFilter($query, 'created_at', request('school-year'), request('semester'));

        return list_page('shared/my-activity', [
            // The table: loaded by the page from /api/my-activity, every row
            // (it paginates in the browser), as { data: [...] }.
            'logs' => list_prop(fn () => ['data' => ActionLogResource::collection($query->get())]),
            'action_types' => ActionLog::where('user_id', auth()->id())->distinct()->orderBy('action_type')->pluck('action_type'),
            'action_type' => request('action_type', 'all'),
            'school_years' => \App\Models\SchoolYear::orderByDesc('year')->pluck('year'),
            'school_year' => request('school-year', 'all'),
            'semester' => request('semester', 'all'),
        ]);
    }
}
