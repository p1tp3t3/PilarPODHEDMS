<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Violation extends Model
{
    use HasFactory;

    protected $table = 'violation';

    protected $fillable = ['id', 'violation_name', 'offense_status', 'keywords', 'archived_at'];

    public $timestamps = false;

    // Stored as a JSON array — each keyword is its own list entry, not one
    // flat comma-separated string. Laravel handles the json_encode/decode
    // automatically on save/read.
    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'archived_at' => 'datetime',
        ];
    }

    /** Only violations that can be picked for new complaints (not archived). */
    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    /** Students' records of this violation (complaint subjects). */
    public function subjectViolations(): HasMany
    {
        return $this->hasMany(ComplaintSubjectViolation::class, 'violation_id');
    }

    /** Complaints filed under this violation as their incident. */
    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class, 'incident_id');
    }

    /**
     * Whether any data points to this violation. With data it can only be
     * archived; without, it's deleted outright.
     */
    public function hasLinkedRecords(): bool
    {
        return $this->subjectViolations()->exists() || $this->complaints()->exists();
    }

    public function penalties(): HasMany
    {
        return $this->hasMany(ViolationPenalty::class, 'violation_id');
    }
}
