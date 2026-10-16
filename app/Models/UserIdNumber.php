<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One of the ID numbers a user has had. The current one has ended_at null
 * and always matches users.id_number; earlier ones are history (e.g. the
 * student ID of someone who is now staff).
 */
class UserIdNumber extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'id_number', 'role_id', 'started_at', 'ended_at'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The role this ID number was used for. */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Makes sure the user's current ID is on record (users created by raw
     * inserts, e.g. CSV imports, may not have a row yet).
     */
    public static function ensureCurrent(User $user, ?string $role = null): ?self
    {
        if (blank($user->id_number)) {
            return null;
        }

        $role ??= $user->role;

        return self::firstOrCreate(
            ['user_id' => $user->id, 'ended_at' => null],
            ['id_number' => $user->id_number, 'role_id' => $role ? Role::idFor($role) : null, 'started_at' => $user->created_at ?? now()]
        );
    }

    /**
     * Gives the user a new ID number: the current one is ended (kept as
     * history) and the new one becomes current, here and on users.id_number.
     * No-op when the ID doesn't actually change.
     */
    public static function change(User $user, string $newIdNumber, string $role): void
    {
        $newIdNumber = trim($newIdNumber);
        if ($newIdNumber === '' || strcasecmp($newIdNumber, (string) $user->id_number) === 0) {
            return;
        }

        self::ensureCurrent($user)?->update(['ended_at' => now()]);

        self::create([
            'user_id' => $user->id,
            'id_number' => $newIdNumber,
            'role_id' => Role::idFor($role),
            'started_at' => now(),
        ]);

        // Raw update so the User model's save() override (role handling)
        // isn't involved in what is only an ID change.
        User::whereKey($user->id)->update(['id_number' => $newIdNumber]);
        $user->id_number = $newIdNumber;
    }

    /** Whether this ID is (or was) held by anyone other than $exceptUserId. */
    public static function takenByOther(string $idNumber, int $exceptUserId): bool
    {
        return User::where('id_number', $idNumber)->where('id', '!=', $exceptUserId)->exists()
            || self::where('id_number', $idNumber)->where('user_id', '!=', $exceptUserId)->exists();
    }
}
