<?php

namespace App\Models;

use Database\Factories\ParentRegistrationRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParentRegistrationRequest extends Model
{
    /** @use HasFactory<ParentRegistrationRequestFactory> */
    use HasFactory;

    protected $table = 'parent_registration_request';

    protected $fillable = ['name', 'email', 'parent_details', 'reason', 'is_agreed', 'parent_id'];

    protected function casts(): array
    {
        return ['is_agreed' => 'boolean'];
    }

    /** The parent account generated when this request was approved (null while pending). */
    public function parent(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function isApproved(): bool
    {
        return $this->parent_id !== null;
    }

    /** Links the approved request to the parent account generated for it. */
    public function linkParent(User $parent): void
    {
        $this->update(['parent_id' => $parent->id]);
    }

    public $timestamps = false;
}
