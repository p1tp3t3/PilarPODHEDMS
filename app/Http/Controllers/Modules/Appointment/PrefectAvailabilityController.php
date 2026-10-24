<?php

namespace App\Http\Controllers\Modules\Appointment;

use App\Http\Controllers\Controller;
use App\Models\ActionLog;
use App\Models\PrefectAvailability;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The prefect's weekly availability schedule (Mon–Sat). Every signed-in
 * user can read it; only a prefect edits it, and only their own.
 */
class PrefectAvailabilityController extends Controller
{
    private const MAX_SLOTS_PER_DAY = 6;

    /** Every prefect with their weekly time ranges. */
    public function index()
    {
        $prefects = User::with('profile')->whereRole('sub_admin')->get();
        $slots = PrefectAvailability::whereIn('user_id', $prefects->pluck('id'))
            ->orderBy('day_of_week')->orderBy('start_time')
            ->get()
            ->groupBy('user_id');

        return response()->json([
            'prefects' => $prefects->map(fn ($p) => [
                'id' => $p->id,
                'name' => trim(($p->profile?->first_name ?? '').' '.($p->profile?->last_name ?? '')) ?: 'Prefect',
                'slots' => ($slots[$p->id] ?? collect())->map(fn ($s) => self::slotShape($s))->values(),
            ])->values(),
        ]);
    }

    /** Replace the signed-in prefect's whole week. */
    public function update(Request $request)
    {
        abort_unless(auth()->user()->role === 'sub_admin', 403);

        $data = $request->validate([
            'slots' => 'present|array|max:36',
            'slots.*.day_of_week' => 'required|integer|between:1,6',
            'slots.*.start_time' => 'required|date_format:H:i',
            'slots.*.end_time' => 'required|date_format:H:i',
        ]);

        $byDay = collect($data['slots'])->groupBy('day_of_week');
        $errors = [];
        foreach ($data['slots'] as $i => $slot) {
            if ($slot['end_time'] <= $slot['start_time']) {
                $errors["slots.$i.end_time"] = 'The end time must be later than the start time.';
            }
        }
        foreach ($byDay as $day => $daySlots) {
            if ($daySlots->count() > self::MAX_SLOTS_PER_DAY) {
                $errors['slots'] = 'At most '.self::MAX_SLOTS_PER_DAY.' time ranges per day.';
            }
            $sorted = $daySlots->sortBy('start_time')->values();
            for ($k = 1; $k < $sorted->count(); $k++) {
                if ($sorted[$k]['start_time'] < $sorted[$k - 1]['end_time']) {
                    $errors['slots'] = 'Time ranges on the same day must not overlap.';
                }
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        $userId = auth()->id();
        DB::transaction(function () use ($data, $userId) {
            PrefectAvailability::where('user_id', $userId)->delete();
            foreach ($data['slots'] as $slot) {
                PrefectAvailability::create([
                    'user_id' => $userId,
                    'day_of_week' => $slot['day_of_week'],
                    'start_time' => $slot['start_time'],
                    'end_time' => $slot['end_time'],
                ]);
            }
        });

        ActionLog::log($userId, 'appointment', 'Updated the availability schedule', ['time_ranges' => ['to' => count($data['slots'])]]);

        return $this->index();
    }

    private static function slotShape(PrefectAvailability $s): array
    {
        return [
            'day_of_week' => $s->day_of_week,
            'start_time' => substr($s->start_time, 0, 5),
            'end_time' => substr($s->end_time, 0, 5),
        ];
    }
}
