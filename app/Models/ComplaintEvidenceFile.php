<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintEvidenceFile extends Model
{
    protected $table = 'complaint_evidence_file';

    protected $fillable = ['complaint_case_number', 'evidence_file', 'file_type'];

    public $timestamps = false;

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'case_number', 'complaint_case_number');
    }
}
