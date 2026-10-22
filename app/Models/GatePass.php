<?php

namespace App\Models;

use App\Models\Concerns\HasDerivedSchoolYearSemester;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GatePass extends Model
{
    use HasFactory, HasDerivedSchoolYearSemester;

    protected $table = 'gate_pass';


    // Always load who filed it on someone's behalf, so every list/table
    // can show "Filed By (Prefect)" without each query having to ask.
    protected $with = ['prefect.profile'];
    protected $fillable = [
        'gatepass_number', 'user_id', 'prefect_id', 'reason', 'allow_to', 'confirmed_at', 'date_expiration',
        'rejected_reason', 'rejected_at', 'revoked_at', 'edited_at', 'archived_at',
    ];

    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(GatePassRevision::class, 'gate_pass_id', 'id');
    }

    // The prefect who issued this gate pass directly (null when the student
    // submitted it themselves).
    public function prefect(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prefect_id', 'id');
    }
}
