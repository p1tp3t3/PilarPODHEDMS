<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GatePassRevision extends Model
{
    public $table = 'gate_pass_revision',
           $timestamps = false;

    public $fillable = [
        'gate_pass_id',
        'reason',
        'created_at',
    ];

    public function gatepass()
    {
        return $this->belongsTo(GatePass::class, 'gate_pass_id', 'id');
    }
}
