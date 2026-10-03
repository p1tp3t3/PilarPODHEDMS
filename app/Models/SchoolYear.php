<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SchoolYear extends Model
{
    use HasFactory;

    protected $table = 'school_year';

    protected $fillable = ['year'];

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'school_year_id', 'id');
    }

    public function semesters(): HasMany
    {
        return $this->hasMany(SchoolYearSemester::class, 'school_year_id')->orderBy('semester');
    }

    public function activeSemester(): HasOne
    {
        $today = now()->toDateString();

        return $this->hasOne(SchoolYearSemester::class, 'school_year_id')
            ->whereDate('date_start', '<=', $today)
            ->whereDate('date_end', '>=', $today);
    }

    /**
     * Whether today falls within one of this school year's semesters —
     * the "is this the current school year" check, purely date-driven
     * (no more manually-toggled activate flag to go stale).
     */
    public function isCurrent(): bool
    {
        $today = now()->toDateString();

        return $this->semesters->contains(
            fn (SchoolYearSemester $s) => $s->date_start && $s->date_end
                && $today >= $s->date_start->toDateString()
                && $today <= $s->date_end->toDateString()
        );
    }
}
