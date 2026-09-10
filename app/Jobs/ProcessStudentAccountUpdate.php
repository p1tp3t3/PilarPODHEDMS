<?php

namespace App\Jobs;

use App\Models\Enrollment;
use App\Models\SchoolYear;
use App\Models\User;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessStudentAccountUpdate implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    protected $csvPath, $schoolYear;
    public function __construct($csvPath, $schoolYear)
    {
        $this->csvPath = $csvPath;
        $this->schoolYear = $schoolYear;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        DB::beginTransaction();
        try {
            $csvArr = get_user_df($this->csvPath);
            $enrolledIds = collect($csvArr)->pluck('student_id')->map(fn($id) => strtolower($id))->all();

            $students = User::where('role', 'student')->get(['id', 'id_number']);

            foreach ($students as $student) {
                $isEnrolled = in_array(strtolower($student->id_number ?? ''), $enrolledIds, true);
                self::activateStudent($student, $isEnrolled);
            }
            DB::commit();
        }catch(Exception $x) {
            DB::rollBack();
            Log::error('ProcessStudentAccountUpdate failed: ' . $x->getMessage());
        }
    }

    private function activateStudent(User $student, $activate) {
        $student->update([
            'activate' => $activate
        ]);

        $schoolYearId = SchoolYear::where('year', $this->schoolYear)->value('id');

        Enrollment::where('student_id', $student->id)
            ->where('school_year_id', $schoolYearId)
            ->update([
                'status' => $activate ? 'enrolled' : 'dropped',
                'dropped_at' => $activate ? null : now(),
            ]);
    }
}
