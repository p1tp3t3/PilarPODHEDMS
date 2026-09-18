<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintSubjectViolation extends Model
{
    use HasFactory;

    protected $table = 'complaint_subject_violation';

    protected $fillable = ['complaint_id', 'student_id', 'violation_id'];

    public $timestamps = false;

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id', 'id');
    }

    public function violation(): BelongsTo
    {
        return $this->belongsTo(Violation::class, 'violation_id', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
}
