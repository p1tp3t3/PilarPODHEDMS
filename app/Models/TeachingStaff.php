<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TeachingStaff extends Model
{
    use HasFactory;

    protected $table = 'teaching_staff';

    protected $fillable = ['user_id', 'program_id', 'position_id'];

    public $timestamps = false;

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    // Every existing read of ->position (backend and, via
    // TeachingStaffResource/UserSearchResource/UserResource's
    // whenLoaded() pass-through, frontend JSON) expects 'faculty' or
    // 'program_head' as a plain string, matching how it worked when this
    // was itself an enum column — this accessor preserves that after the
    // position_id foreign-key conversion, so none of those call sites
    // needed to change.
    protected $appends = ['position'];

    protected $with = ['positionRef'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id', 'id');
    }

    /**
     * Every program this person is the program head of — a program head is
     * no longer capped at one (program_id above stays their "home" program
     * for faculty-grouping/display purposes only). program_head_program is
     * the single source of truth for head assignments, including the home
     * program itself, so this is the list to check against, not program_id.
     */
    public function programsHandled(): BelongsToMany
    {
        return $this->belongsToMany(
            Program::class,
            'program_head_program',
            'user_id',
            'program_id',
            'user_id',
            'id'
        );
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
