<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComplaintSubject extends Model
{
    use HasFactory;

    protected $table = 'complaint_subject';

    protected $fillable = ['complaint_id', 'student_id', 'incident_summary'];

    public $timestamps = false;

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id', 'id');
    }

    public function violation(): BelongsTo
    {
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
    public function offenses(): HasMany
    {
        return $this->hasMany(ComplaintSubjectViolation::class, 'complaint_id', 'complaint_id');
    }

    public function complaintSubjectOffense(): HasMany
    {
        return $this->hasMany(ComplaintSubjectViolation::class, 'complaint_id', 'complaint_id')
            ->where('student_id', $this->student_id);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
}
