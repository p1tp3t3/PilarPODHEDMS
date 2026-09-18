<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class SchoolYearSemester extends Model
{
    protected $table = 'school_year_semester';

    protected $fillable = ['school_year_id', 'semester', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    /**
     * The active semester of the currently active school year — is_active
     * alone isn't enough to identify this, since a semester's is_active
     * flag isn't reset when its school year is later closed (so more than
     * one row can have is_active=true across different school years).
     */
    public static function current(): ?self
    {
        return self::whereHas('schoolYear', fn ($q) => $q->where('activate', true))
            ->where('is_active', true)
            ->first();
    }

    public static function currentId(): ?int
    {
        return self::current()?->id;
    }

    /**
     * Resolves the semester a given date falls into, using an Aug-Jul
     * academic year (1st semester: Aug-Dec, 2nd: Jan-Jul). Used to backdate
     * seeded requests to the semester that was actually running when their
     * (randomly backdated) created_at happened, instead of stamping every
     * seeded row with today's semester.
     */
    public static function idForDate($date): ?int
    {
        $date = Carbon::parse($date);
        $startYear = $date->month >= 8 ? $date->year : $date->year - 1;
        $semester = $date->month >= 8 ? 1 : 2;

        return self::whereHas('schoolYear', fn ($q) => $q->where('year', "{$startYear}-".($startYear + 1)))
            ->where('semester', $semester)
            ->value('id');
    }
}
