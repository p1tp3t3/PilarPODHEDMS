<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ComplaintSubject extends Model
{
    use HasFactory;

    public $table = 'complaint_subject',
           $fillable = ['complaint_id', 'student_id', 'incident_summary'],
           $timestamps = false;

    public function complaint() {
        return $this->belongsTo(Complaint::class, 'complaint_id', 'id');
    }
    public function violation() {
        return $this->belongsTo(Violation::class, 'offense_id', 'id');
    }
    // Only scoped by complaint_id — a hasMany can't also be constrained by
    // student_id against the PARENT's own column here: whereColumn can only
    // reference the related table (complaint_subject_violation) in an
    // eager-loaded query, so a self-referential "student_id = student_id"
    // (the previous, broken version of this relation) silently matched
    // every student's offenses for the complaint, not just this subject's.
    // Every caller of ->offenses must additionally filter the loaded
    // collection by student_id itself — see ViolationController.php's
    // ->where('student_id', $studentId) after ->offenses for the pattern.
    public function offenses()
    {
        return $this->hasMany(ComplaintSubjectViolation::class, 'complaint_id', 'complaint_id');
    }

    public function complaintSubjectOffense() {
        return $this->hasMany(ComplaintSubjectViolation::class, 'complaint_id', 'complaint_id')
                    ->where('student_id', $this->student_id);
    }


    public function user() {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
}
