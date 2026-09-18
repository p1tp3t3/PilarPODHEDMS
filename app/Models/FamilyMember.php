<?php

namespace App\Models;

use Database\Factories\FamilyMemberFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMember extends Model
{
    /** @use HasFactory<FamilyMemberFactory> */
    use HasFactory;

    protected $table = 'family_member';

    protected $fillable = ['family_id', 'member_id'];

    public $timestamps = false;

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class, 'family_id', 'id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'member_id', 'id');
    }
}
