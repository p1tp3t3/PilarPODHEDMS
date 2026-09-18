<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintRevision extends Model
{
    protected $table = 'complaint_revision';

    public $timestamps = false;

    protected $fillable = [
        'complaint_id',
        'incident',
        'complaint_description',
        'complaint_evidences',
        'subjects',
        'created_at',
    ];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id', 'id');
    }
}
