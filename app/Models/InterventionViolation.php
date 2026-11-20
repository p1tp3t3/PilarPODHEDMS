<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * A link between an intervention (appointment, referral or office call) and
 * a violation it addresses. See the create_intervention_violations migration.
 */
class InterventionViolation extends Model
{
    public const APPOINTMENT = 'appointment';

    public const REFERRAL = 'referral';

    public const CALL_IN = 'call_in';

    public const UPDATED_AT = null;

    protected $table = 'intervention_violations';

    protected $guarded = ['id'];

    /**
     * The violation ids from a request value: an array, or a JSON array (as
     * sent with multipart forms). Only existing violations, each once.
     *
     * @return array<int, int>
     */
    public static function parseIds(mixed $value): array
    {
        if (is_string($value)) {
            $value = json_decode($value, true);
        }
        $ids = collect(is_array($value) ? $value : [])
            ->filter(fn ($v) => is_numeric($v))
            ->map(fn ($v) => (int) $v)
            ->unique()
            ->values();
        if ($ids->isEmpty()) {
            return [];
        }

        return DB::table('violation')->whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
    }

    /**
     * Replaces the violations an intervention addresses for one student
     * (an appointment's or office call's student, or one referred student).
     */
    public static function sync(string $type, int $interventionId, int $studentId, array $violationIds): void
    {
        self::where('intervention_type', $type)->where('intervention_id', $interventionId)
            ->where('student_id', $studentId)->delete();
        foreach (array_unique($violationIds) as $violationId) {
            self::create([
                'intervention_type' => $type,
                'intervention_id' => $interventionId,
                'student_id' => $studentId,
                'violation_id' => (int) $violationId,
            ]);
        }
    }

    /**
     * The violations an intervention addresses, per student:
     * [student id => [{id, name}, ...]] (a referral's referred students).
     *
     * @return array<int, array<int, array{id: int, name: string}>>
     */
    public static function linkedByStudent(string $type, int $interventionId): array
    {
        return DB::table('intervention_violations as iv')
            ->join('violation as v', 'v.id', '=', 'iv.violation_id')
            ->where('iv.intervention_type', $type)
            ->where('iv.intervention_id', $interventionId)
            ->whereNotNull('iv.student_id')
            ->orderBy('v.violation_name')
            ->get(['iv.student_id', 'v.id', 'v.violation_name as name'])
            ->groupBy('student_id')
            ->map(fn ($rows) => $rows->map(fn ($r) => ['id' => (int) $r->id, 'name' => $r->name])->values()->all())
            ->all();
    }

    /**
     * The violations linked to each of many interventions of one type, in one
     * query: [intervention id => [{id, name}, ...]].
     *
     * @return array<int, array<int, array{id: int, name: string}>>
     */
    public static function linkedMany(string $type, iterable $interventionIds): array
    {
        $ids = collect($interventionIds)->filter()->map(fn ($id) => (int) $id)->unique()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        return DB::table('intervention_violations as iv')
            ->join('violation as v', 'v.id', '=', 'iv.violation_id')
            ->where('iv.intervention_type', $type)
            ->whereIn('iv.intervention_id', $ids)
            ->orderBy('v.violation_name')
            ->distinct()
            ->get(['iv.intervention_id', 'v.id', 'v.violation_name as name'])
            ->groupBy('intervention_id')
            ->map(fn ($rows) => $rows->map(fn ($r) => ['id' => (int) $r->id, 'name' => $r->name])->values()->all())
            ->all();
    }

    /**
     * Violation ids as [{id, name}] (e.g. the ones chosen on a pending
     * appointment invitation, not linked yet).
     *
     * @return array<int, array{id: int, name: string}>
     */
    public static function named(array $violationIds): array
    {
        $ids = collect($violationIds)->filter(fn ($v) => is_numeric($v))->map(fn ($v) => (int) $v)->unique();
        if ($ids->isEmpty()) {
            return [];
        }

        return DB::table('violation')->whereIn('id', $ids)->orderBy('violation_name')
            ->get(['id', 'violation_name as name'])
            ->map(fn ($r) => ['id' => (int) $r->id, 'name' => $r->name])
            ->all();
    }

    /**
     * The violations linked to an intervention (each once, for any of its
     * students), as [{id, name}].
     *
     * @return array<int, array{id: int, name: string}>
     */
    public static function linked(string $type, int $interventionId): array
    {
        return DB::table('intervention_violations as iv')
            ->join('violation as v', 'v.id', '=', 'iv.violation_id')
            ->where('iv.intervention_type', $type)
            ->where('iv.intervention_id', $interventionId)
            ->orderBy('v.violation_name')
            ->distinct()
            ->get(['v.id', 'v.violation_name as name'])
            ->map(fn ($r) => ['id' => (int) $r->id, 'name' => $r->name])
            ->all();
    }
}
