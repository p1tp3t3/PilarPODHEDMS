<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComplaintRevision extends Model
{
    public $table = 'complaint_revision',
           $timestamps = false;

    public $fillable = [
        'complaint_id',
        'incident',
        'complaint_description',
        'complaint_evidences',
        'subjects',
        'created_at',
    ];

    public function complaint()
    {
        return $this->belongsTo(Complaint::class, 'complaint_id', 'id');
    }
}
