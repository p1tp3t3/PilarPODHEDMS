<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ViolationAccessRequest extends Model
{
    /**
     * How long an approval stays valid before the super admin has to
     * request access again.
     */
    public const ACCESS_DURATION_MINUTES = 60;

    public const RESOURCES = ['violation', 'penalty'];
    public const ACCESS_TYPES = ['add', 'edit', 'delete'];

    /**
     * Penalties have no "edit" endpoint — only create/delete — so that
     * combination is never a valid request.
     */
    public const VALID_COMBINATIONS = [
        'violation' => ['add', 'edit', 'delete'],
        'penalty' => ['add', 'delete'],
    ];

    protected $fillable = [
        'user_id',
        'resource',
        'access_type',
        'reason',
        'response_reason',
        'status',
        'responded_by',
        'responded_at',
        'expires_at',
        'approved_at',
        'denied_at',
        'revoked_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
            'expires_at' => 'datetime',
            'approved_at' => 'datetime',
            'denied_at' => 'datetime',
            'revoked_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function responder()
    {
        return $this->belongsTo(User::class, 'responded_by', 'id');
    }

    /**
     * A grant is scoped to the specific resource + action it was approved
     * for — an "add" approval on violations doesn't also let the holder add
     * penalties, edit violations, or anything else — and it's single-use:
     * once consumed (status flips to 'used'), it stops counting as active
     * even though it hasn't expired yet.
     */
    public static function hasActiveAccess(int $userId, string $resource, string $accessType): bool
    {
        return self::activeGrant($userId, $resource, $accessType) !== null;
    }

    /**
     * The actual row backing an active grant, so the middleware can mark it
     * used the moment it lets a request through.
     */
    public static function activeGrant(int $userId, string $resource, string $accessType): ?self
    {
        return self::where('user_id', $userId)
            ->where('resource', $resource)
            ->where('access_type', $accessType)
            ->where('status', 'approved')
            ->where('expires_at', '>', now())
            ->first();
    }

    public static function hasPendingRequest(int $userId, string $resource, string $accessType): bool
    {
        return self::where('user_id', $userId)
            ->where('resource', $resource)
            ->where('access_type', $accessType)
            ->where('status', 'pending')
            ->exists();
    }

    /**
     * Every request the user has made, newest first — a user can hold
     * separate concurrent grants per resource/access_type combination, so
     * "current status" is a list, not a single row.
     */
    public static function allFor(int $userId)
    {
        return self::where('user_id', $userId)->latest('id')->get();
    }
}
