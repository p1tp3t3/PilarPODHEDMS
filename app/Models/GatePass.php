<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GatePass extends Model
{
    use HasFactory;

    public $table = 'gate_pass',
           $fillable = [
               'gatepass_number', 'user_id', 'reason', 'allow_to', 'confirmed_at', 'date_expiration',
               'rejected_reason', 'rejected_at', 'revoked_at', 'edited_at', 'archived_at',
           ],
           $timestamps = false;

    public function user() {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function revisions() {
        return $this->hasMany(GatePassRevision::class, 'gate_pass_id', 'id');
    }
}
