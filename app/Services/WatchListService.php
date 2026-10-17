<?php

namespace App\Services;

use App\Http\Controllers\Modules\Violation\ViolationController;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Prefect dashboard "Watch List": currently enrolled students whom the
 * Early Intervention Violation Predictor says will repeat a violation
 * (probability >= 50%). Every enrolled student's violations are scored in
 * one batch call to the Python ML service; the result is cached briefly
 * and cleared whenever the model is retrained.
 */
class WatchListService
{
    public const CACHE_KEY = 'prefect_watch_list';

    private const CACHE_MINUTES = 10;

    public static function get(bool $refresh = false): array
    {
        if ($refresh) {
            Cache::forget(self::CACHE_KEY);
        }

        $cached = Cache::get(self::CACHE_KEY);
        if ($cached !== null) {
            return $cached;
        }

        $result = self::compute();
        // Don't cache an outage, so the list comes back as soon as the service does.
        if ($result['available']) {
            Cache::put(self::CACHE_KEY, $result, now()->addMinutes(self::CACHE_MINUTES));
        }

        return $result;
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * One student's risk (for the student violation page): whether the
     * model predicts they'll repeat any of their violations, and the
     * highest probability. Not cached — it's one quick batch call.
     */
    public static function forStudent(int $studentId): array
    {
        $inputs = ViolationController::modelInputsForStudents([$studentId]);
        if ($inputs->isEmpty()) {
            return ['available' => true, 'likely' => false, 'top_probability' => null];
        }

        $scores = self::score($inputs);
        if ($scores === null) {
            return ['available' => false, 'likely' => false];
        }

        $top = $scores->sortByDesc('probability')->first();

        return [
            'available' => true,
            'likely' => $scores->contains(fn ($s) => (int) $s['prediction'] === 1),
            'top_probability' => $top['probability'] ?? null,
            'top_violation_id' => $top ? (int) explode(':', $top['key'])[1] : null,
        ];
    }

    /**
     * Scores model-input rows in one call to the Python batch endpoint,
     * keyed "student_id:violation_id". Null when the service is down.
     */
    private static function score($inputs)
    {
        $rows = $inputs->map(fn ($r) => [
            'key' => "{$r->student_id}:{$r->violation_id}",
            'violation_type' => $r->violation_type,
            'past_repeat_same_violation_count' => (int) $r->past_repeat_same_violation_count,
            'recent_same_violation_count' => (int) $r->recent_same_violation_count,
            'months_since_last_same_violation' => (int) $r->months_since_last_same_violation,
        ])->values()->all();

        try {
            $response = Http::withoutVerifying()
                ->withHeaders(['Authorization' => 'Bearer '.config('services.python_api.key')])
                ->timeout(45)
                ->post(rtrim(config('services.python_api.url'), '/').'/python/model/predict/batch', ['rows' => $rows]);
        } catch (ConnectionException $e) {
            Log::warning('Watch list: prediction service unreachable', ['error' => $e->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('Watch list: prediction service error', ['status' => $response->status()]);

            return null;
        }

        return collect($response->json('results', []))->keyBy('key');
    }

    private static function compute(): array
    {
        $studentIds = User::whereRole('student')->currentlyEnrolled()->pluck('id');
        $inputs = ViolationController::modelInputsForStudents($studentIds);

        $base = ['available' => true, 'checked_students' => $studentIds->count(), 'generated_at' => now()->toIso8601String(), 'students' => []];
        if ($inputs->isEmpty()) {
            return $base;
        }

        $scores = self::score($inputs);
        if ($scores === null) {
            return ['available' => false];
        }
        $flagged = $inputs->filter(fn ($r) => ($scores["{$r->student_id}:{$r->violation_id}"]['prediction'] ?? 0) === 1);
        if ($flagged->isEmpty()) {
            return $base;
        }

        $users = User::with(['profile', 'program', 'enrollments'])
            ->whereIn('id', $flagged->pluck('student_id')->unique())
            ->get()->keyBy('id');

        $students = $flagged->groupBy('student_id')->map(function ($rows, $studentId) use ($users, $scores) {
            $user = $users[$studentId] ?? null;
            if (! $user) {
                return null;
            }
            $violations = $rows->map(fn ($r) => [
                'violation_id' => $r->violation_id,
                'violation' => $r->violation_type,
                'probability' => (float) $scores["{$r->student_id}:{$r->violation_id}"]['probability'],
                'past' => (int) $r->past_repeat_same_violation_count,
                'recent' => (int) $r->recent_same_violation_count,
                'months_since_last' => (int) $r->months_since_last_same_violation,
            ])->sortByDesc('probability')->values();

            return [
                'id' => $user->id,
                'encrypted_id' => $user->encrypted_id,
                'username' => $user->username,
                'id_number' => $user->id_number,
                'role' => $user->role,
                'profile' => $user->profile?->only(['first_name', 'middle_name', 'last_name', 'profile_picture', 'sex']),
                'program' => $user->program?->only(['name']),
                'enrollments' => $user->enrollments->map->only(['year_level', 'program_id'])->values()->all(),
                'top_probability' => $violations->first()['probability'],
                // Plain arrays only: the cache won't rebuild objects such as Collections.
                'violations' => $violations->all(),
            ];
        })->filter()->sortByDesc('top_probability')->values()->all();

        return array_merge($base, ['students' => $students]);
    }
}
