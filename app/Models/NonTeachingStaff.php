<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonTeachingStaff extends Model
{
    use HasFactory;

    protected $table = 'non_teaching_staff';

    protected $fillable = ['user_id', 'position_id'];

    public $timestamps = false;

    // user_id (the FK to users.id) is the table's own primary key — no
    // separate surrogate id column.
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    // Every existing read of ->position (backend and, via UserResource's
    // whenLoaded() pass-through, frontend JSON) expects the position's NAME
    // as a plain string, matching how it worked when this was itself an
    // enum column — this accessor preserves that after the position_id
    // foreign-key conversion, so none of those call sites needed to change.
    protected $appends = ['position'];

    protected $with = ['positionRef'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function positionRef(): BelongsTo
    {
        return $this->belongsTo(Position::class, 'position_id');
    }

    protected function position(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->positionRef?->name,
        );
    }
}
