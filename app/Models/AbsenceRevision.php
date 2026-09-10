<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AbsenceRevision extends Model
{
    public $table = 'absence_revision',
           $timestamps = false;

    public $fillable = [
        'absence_id',
        'reason',
        'date_from',
        'date_to',
        'evidences',
        'created_at',
    ];

    public function absence()
    {
        return $this->belongsTo(Absence::class, 'absence_id', 'id');
    }
}
