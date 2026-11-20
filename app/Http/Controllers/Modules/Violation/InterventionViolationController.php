<?php

namespace App\Http\Controllers\Modules\Violation;

use App\Http\Controllers\Controller;
use App\Models\InterventionViolation;
use App\Models\Referral;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The "Related violation(s)" of an intervention (appointment, referral,
 * office call): which of the student's violations it addresses.
 */
class InterventionViolationController extends Controller
{
    /**
     * The violations these students have a resolved record of (the only ones
     * an intervention can be counted toward), with each one's record: how
     * many times and when last. [{id, name, times, last_at}].
     */
    public function options(Request $request)
    {
        $ids = collect((array) $request->query('students', []))
            ->map(fn ($v) => decrypt_id((string) $v) ?? (is_numeric($v) ? (int) $v : null))
            ->filter()
            ->unique()
            ->values();
        if ($ids->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $rows = DB::table('complaint as c')
            ->join('complaint_subject_violation as cso', 'cso.complaint_id', '=', 'c.id')
            ->join('violation as v', 'v.id', '=', 'cso.violation_id')
            ->where('c.complaint_status', 'resolved')
            ->whereIn('cso.student_id', $ids)
            ->groupBy('v.id', 'v.violation_name')
            ->orderByDesc('last_at')
            ->selectRaw('v.id, v.violation_name AS name, COUNT(*) AS times,
                MAX(COALESCE(c.offense_issued_at, c.resolved_at, c.confirmed_at, c.created_at)) AS last_at')
            ->get();

        return response()->json(['data' => $rows->map(fn ($r) => [
            'id' => (int) $r->id,
            'name' => $r->name,
            'times' => (int) $r->times,
            'last_at' => $r->last_at,
        ])->values()]);
    }

    /**
     * Sets which violation(s) a referral addresses, per referred student
     * (the Prefect): related_violations = {student id: [violation ids]}.
     * A student can only be linked to violations they have a resolved record
     * of; a student left out keeps their links.
     */
    public function syncReferral(Request $request, $id)
    {
        $id = decrypt_id((string) $id) ?? (is_numeric($id) ? (int) $id : abort(404));
        $referral = Referral::findOrFail($id);
        if (! $referral->awaitsIntervention()) {
            return response()->json(['message' => 'This referral is no longer pending, so its related violations can no longer be changed.'], 422);
        }

        $referred = DB::table('referral_referred_student')->where('referral_id', $referral->id)
            ->pluck('student_id')->map(fn ($s) => (int) $s)->all();
        $input = $request->input('related_violations');
        if (! is_array($input)) {
            return response()->json(['message' => 'Choose the related violations for each referred student.'], 422);
        }

        DB::transaction(function () use ($input, $referred, $referral) {
            foreach ($input as $student => $violationIds) {
                $studentId = decrypt_id((string) $student) ?? (is_numeric($student) ? (int) $student : null);
                abort_unless($studentId && in_array($studentId, $referred, true), 422, 'That student is not referred in this referral.');

                $own = self::recordedViolationIds($studentId);
                $ids = array_values(array_intersect(InterventionViolation::parseIds($violationIds), $own));
                InterventionViolation::sync(InterventionViolation::REFERRAL, $referral->id, $studentId, $ids);
            }
        });

        return response()->json([
            'message' => 'Related violations saved.',
            'related_violations' => InterventionViolation::linked(InterventionViolation::REFERRAL, $referral->id),
            'related_violations_by_student' => (object) InterventionViolation::linkedByStudent(InterventionViolation::REFERRAL, $referral->id),
        ]);
    }

    /** The violations a student has a resolved record of. */
    private static function recordedViolationIds(int $studentId): array
    {
        return DB::table('complaint_subject_violation as cso')
            ->join('complaint as c', 'c.id', '=', 'cso.complaint_id')
            ->where('c.complaint_status', 'resolved')
            ->where('cso.student_id', $studentId)
            ->distinct()
            ->pluck('cso.violation_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }
}
