<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Violation extends Model
{
    use HasFactory;

    protected $table = 'violation';

    protected $fillable = ['id', 'violation_name', 'offense_status', 'keywords'];

    public $timestamps = false;

    // Stored as a JSON array — each keyword is its own list entry, not one
    // flat comma-separated string. Laravel handles the json_encode/decode
    // automatically on save/read.
    protected function casts(): array
    {
        return [
            'keywords' => 'array',
        ];
    }

    public function penalties(): HasMany
    {
        return $this->hasMany(ViolationPenalty::class, 'violation_id');
    }
}
