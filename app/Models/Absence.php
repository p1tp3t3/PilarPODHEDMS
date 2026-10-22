<?php

namespace App\Models;

use App\Models\Concerns\HasDerivedSchoolYearSemester;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Absence extends Model
{
    use HasFactory, HasDerivedSchoolYearSemester;

    protected $table = 'absent_form';


    // Always load who filed it on someone's behalf, so every list/table
    // can show "Filed By (Prefect)" without each query having to ask.
    protected $with = ['prefect.profile'];
    protected $fillable = ['form_number', 'student_id', 'prefect_id', 'reason', 'evidences', 'note', 'rejected_reason', 'rejected_at', 'confirmed_at', 'edited_at', 'revoked_at', 'date_from', 'date_to', 'archived_at'];

    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(AbsenceRevision::class, 'absence_id', 'id')->latest('created_at');
    }

    // The prefect who issued this absent form directly (null when the student
    // submitted it themselves).
    public function prefect(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prefect_id', 'id');
    }
}
