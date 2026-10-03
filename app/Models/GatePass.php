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

    protected $fillable = [
        'gatepass_number', 'user_id', 'reason', 'allow_to', 'confirmed_at', 'date_expiration',
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
}
