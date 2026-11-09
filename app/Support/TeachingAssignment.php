<?php

namespace App\Support;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Support\Collection;
use JsonSerializable;

/**
 * A program head's or faculty member's assignment, read from the
 * program_head or faculty table. It's what $user->teaching returns and how it's
 * serialized ({user_id, program_id, position, program, programs_handled}),
 * the shape the frontend reads.
 *
 * program_id/program: the faculty member's program, or a head's first
 * program (lowest id). programs_handled: every program a head leads (empty for
 * faculty).
 */
class TeachingAssignment implements Arrayable, JsonSerializable
{
    public function __construct(
        public readonly int $user_id,
        public readonly string $position,
        public readonly ?int $program_id,
        public readonly mixed $program,
        public readonly Collection $programs_handled,
    ) {}

    public function isProgramHead(): bool
    {
        return $this->position === 'program_head';
    }

    /** Every program this person belongs to: theirs, plus all they head. */
    public function programIds(): Collection
    {
        return collect([$this->program_id])
            ->merge($this->programs_handled->pluck('id'))
            ->filter()->unique()->values();
    }

    public function toArray(): array
    {
        return [
            'user_id' => $this->user_id,
            'program_id' => $this->program_id,
            'position' => $this->position,
            'program' => $this->program?->toArray(),
            'programs_handled' => $this->programs_handled->map->toArray()->values()->all(),
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
