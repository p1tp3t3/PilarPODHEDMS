<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GatePassReason extends Model
{
    protected $table = 'gate_pass_reason';

    protected $fillable = ['gatepass_id', 'reason'];

    public $timestamps = false;

    public function gatepass(): BelongsTo
    {
        return $this->belongsTo(GatePass::class, 'gatepass_id', 'id');
    }
}
