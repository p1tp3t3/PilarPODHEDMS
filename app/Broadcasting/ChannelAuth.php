<?php

namespace App\Broadcasting;

use App\Models\User;
use Closure;

/**
 * Reusable authorization rules for routes/channels.php, used the way route
 * middleware is: each method returns the callback a channel is guarded by.
 *
 *   Broadcast::channel('notify.{user_id}', ChannelAuth::owner());
 *
 * The broadcasting auth endpoint itself already runs through the
 * web + auth + activate middleware (bootstrap/app.php), so these only
 * decide whether that signed-in, active user may listen on the channel.
 * Every rule also refuses deactivated accounts, in case a socket outlives
 * its session.
 */
class ChannelAuth
{
    /** Only the user whose id is in the channel name. */
    public static function owner(): Closure
    {
        return fn (User $user, $userId) => self::active($user)
            && (int) $user->id === (int) $userId;
    }

    /** Any signed-in user with one of these roles. */
    public static function roles(string ...$roles): Closure
    {
        return fn (User $user) => self::active($user)
            && in_array($user->role, $roles, true);
    }

    /** Gate pass guards (non-teaching staff in the Guard position) and admins. */
    public static function gatePassVerifiers(): Closure
    {
        return fn (User $user) => self::active($user) && (
            in_array($user->role, ['sub_admin', 'super_admin'], true)
            || ($user->role === 'non_teaching_staff' && $user->nonTeachingStaff?->position === 'Guard')
        );
    }

    /**
     * Presence channel: any active user may join. Returns the member info
     * every other member receives, so only what the online list shows.
     */
    public static function presence(): Closure
    {
        return function (User $user) {
            if (! self::active($user)) {
                return false;
            }

            $user->loadMissing('profile');

            // Shared with every member of the channel: the profile link uses
            // the encrypted id — usernames are never sent.
            return [
                'id' => $user->id,
                'encrypted_id' => encrypt_id($user->id),
                'id_number' => $user->id_number,
                'role' => $user->role,
                'name' => trim(($user->profile?->first_name ?? '').' '.($user->profile?->last_name ?? '')) ?: 'User',
                'profile_picture' => $user->profile?->profile_picture,
                'sex' => $user->profile?->sex,
            ];
        };
    }

    private static function active(User $user): bool
    {
        return (bool) $user->activate;
    }
}
