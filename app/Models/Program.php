<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Program extends Model
{
    use HasFactory;

    protected $table = 'program';

    protected $fillable = ['code', 'name', 'logo', 'color_code', 'is_deleted', 'archived_at'];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    /** Only programs offered for new registrations / enrollments (not archived). */
    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    /**
     * Whether any data points to this program (an enrollment, past or
     * current, a faculty member or a program head). With data it can only
     * be archived; without, it's deleted outright.
     */
    public function hasLinkedRecords(): bool
    {
        return $this->enrollments()->exists()
            || $this->faculty()->exists()
            || $this->programHead()->exists();
    }

    /** Faculty members who teach in this program. */
    public function faculty(): HasMany
    {
        return $this->hasMany(Faculty::class, 'program_id', 'id');
    }

    /** This program's head (a program has at most one). */
    public function programHead(): HasOne
    {
        return $this->hasOne(ProgramHead::class, 'program_id', 'id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'program_id', 'id');
    }
}
