<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActionLogResource;
use App\Models\ActionLog;
use Inertia\Inertia;

/**
 * "My Activity": every user's own action log — only their own entries,
 * never anyone else's (the full log stays the IT admin's report).
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

        return Inertia::render('other/my-activity', [
            'logs' => ActionLogResource::collection($query->paginate(50)->withQueryString())->response()->getData(true),
            'action_types' => ActionLog::where('user_id', auth()->id())->distinct()->orderBy('action_type')->pluck('action_type'),
            'action_type' => request('action_type', 'all'),
        ]);
    }
}
