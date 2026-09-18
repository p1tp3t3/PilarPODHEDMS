<?php

namespace App\Models;

use Database\Factories\ParentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Parents extends Model
{
    /** @use HasFactory<ParentFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'parent';

    protected $fillable = ['user_id', 'parent_role', 'work_occupation'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
