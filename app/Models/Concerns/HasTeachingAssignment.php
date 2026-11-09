<?php

namespace App\Models\Concerns;

use App\Models\Faculty;
use App\Models\Program;
use App\Models\ProgramHead;
use App\Support\TeachingAssignment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Collection;

/**
 * The two teaching roles, program_head and faculty, each with its own
 * table: faculty (one row) or program_head (one row per program headed).
 * This gives User one view of both: $user->teaching (a TeachingAssignment
 * or null), scopes for querying, and helpers for the programs a person
 * belongs to.
 */
trait HasTeachingAssignment
{
    /** The teaching roles. Both teach in a program; a program head also leads it. */
    public const TEACHING_ROLES = ['program_head', 'faculty'];

    /** Eager-load these (prefixed as needed) wherever `teaching` is read for many users. */
    public const TEACHING_RELATIONS = ['faculty.program', 'headships.program'];

    public function isTeacher(): bool
    {
        return in_array($this->role, self::TEACHING_ROLES, true);
    }

    public function faculty(): HasOne
    {
        return $this->hasOne(Faculty::class, 'user_id', 'id');
    }

    /** One row per program this person heads, by program. */
    public function headships(): HasMany
    {
        return $this->hasMany(ProgramHead::class, 'user_id', 'id')->orderBy('program_id');
    }

    public function programsHeaded(): BelongsToMany
    {
        return $this->belongsToMany(Program::class, 'program_head', 'user_id', 'program_id');
    }

    /**
     * The teaching assignment, or null if this person is neither faculty
     * nor a program head. Loaded on demand only for program heads and
     * faculty, so serializing other users costs no queries.
     */
    protected function teaching(): Attribute
    {
        return Attribute::make(get: function () {
            $loaded = $this->relationLoaded('faculty') || $this->relationLoaded('headships');
            if (! $loaded && ! $this->isTeacher()) {
                return null;
            }
            $this->loadMissing(self::TEACHING_RELATIONS);

            $headships = $this->headships;
            if ($headships->isNotEmpty()) {
                $first = $headships->first();

                return new TeachingAssignment(
                    $this->id, 'program_head', $first->program_id, $first->program,
                    $headships->pluck('program')->filter()->values(),
                );
            }

            return $this->faculty
                ? new TeachingAssignment($this->id, 'faculty', $this->faculty->program_id, $this->faculty->program, collect())
                : null;
        })->shouldCache();
    }

    public function isProgramHead(): bool
    {
        return $this->relationLoaded('headships')
            ? $this->headships->isNotEmpty()
            : $this->headships()->exists();
    }

    /** Program ids a teacher belongs to: their own program plus any they head. */
    public static function teachingProgramIdsFor(int $userId): Collection
    {
        return Faculty::where('user_id', $userId)->whereNotNull('program_id')->pluck('program_id')
            ->merge(ProgramHead::where('user_id', $userId)->pluck('program_id'))
            ->unique()->values();
    }

    /** Program ids this person heads (empty if not a program head). */
    public static function headedProgramIdsFor(int $userId): Collection
    {
        return ProgramHead::where('user_id', $userId)->orderBy('program_id')->pluck('program_id');
    }

    /** Program heads / faculty who head or teach in any of these programs. */
    public function scopeTeachingInPrograms(Builder $query, $programIds): Builder
    {
        $ids = collect($programIds)->filter()->values()->all();

        return $query->where(fn ($q) => $q
            ->whereHas('faculty', fn ($f) => $f->whereIn('program_id', $ids))
            ->orWhereHas('headships', fn ($h) => $h->whereIn('program_id', $ids)));
    }

    /** 'faculty' or 'program_head'. */
    public function scopeWithTeachingPosition(Builder $query, string $position): Builder
    {
        return $position === 'program_head'
            ? $query->whereHas('headships')
            : $query->whereHas('faculty');
    }

    /**
     * Sets this person's teaching assignment, replacing any other: faculty
     * of $programId, or program head of $programId.
     */
    public function assignTeaching(string $position, ?int $programId): void
    {
        if ($position === 'program_head') {
            Faculty::where('user_id', $this->id)->delete();
            ProgramHead::where('user_id', $this->id)->delete();
            ProgramHead::create(['user_id' => $this->id, 'program_id' => $programId]);
        } else {
            ProgramHead::where('user_id', $this->id)->delete();
            Faculty::updateOrCreate(['user_id' => $this->id], ['program_id' => $programId]);
        }
        $this->unsetRelation('faculty')->unsetRelation('headships');
    }
}
