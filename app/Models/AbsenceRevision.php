<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbsenceRevision extends Model
{
    protected $table = 'absence_revision';

    public $timestamps = false;

    protected $fillable = [
        'absence_id',
        'reason',
        'date_from',
        'date_to',
        'evidences',
        'created_at',
    ];

    public function absence(): BelongsTo
    {
        return $this->belongsTo(Absence::class, 'absence_id', 'id');
    }
}
