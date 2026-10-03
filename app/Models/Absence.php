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

    protected $fillable = ['form_number', 'student_id', 'reason', 'evidences', 'note', 'rejected_reason', 'rejected_at', 'confirmed_at', 'edited_at', 'revoked_at', 'date_from', 'date_to', 'archived_at'];

    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(AbsenceRevision::class, 'absence_id', 'id')->latest('created_at');
    }
}
