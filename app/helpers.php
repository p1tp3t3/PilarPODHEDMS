<?php

use App\Events\NotifyUser;
use App\Models\Notifications;
use App\Models\Position;
use Illuminate\Support\Facades\Crypt;

/*
|--------------------------------------------------------------------------
| Global helpers
|--------------------------------------------------------------------------
|
| Logic that used to live on a controller but is actually called from
| several unrelated controllers/jobs (i.e. the controller was only being
| used as a namespace for a shared utility, not for its own HTTP actions)
| belongs here instead — a controller instantiated purely to borrow one of
| its methods is a smell. Anything only ever called from one other class
| stays put on its original controller.
|
*/

if (!function_exists('notify_single_user')) {
    /**
     * Insert a notification row and broadcast it.
     */
    function notify_single_user($notifField, $broadcast = null)
    {
        Notifications::insert($notifField);
        broadcast(new NotifyUser($notifField['receiver_id']));
    }
}

if (!function_exists('is_program_head')) {
    /**
     * The authenticated user's program name(s) if they're a program head,
     * else null. A program head can lead 2+ programs (one program_head row
     * each), so this joins all of them.
     */
    function is_program_head()
    {
        $names = \App\Models\Program::whereIn('id', \App\Models\User::headedProgramIdsFor(auth()->id()))->pluck('name');

        return $names->isNotEmpty() ? $names->implode(', ') : null;
    }
}

if (!function_exists('generate_username')) {
    function generate_username($firstName)
    {
        $firstName = trim($firstName);
        return strtolower($firstName . random_int(100, 999));
    }
}

if (!function_exists('get_user_df')) {
    /**
     * Reads a CSV file into an array of associative rows keyed by its
     * header row.
     */
    function get_user_df($filePath)
    {
        $rows = array_map('str_getcsv', file($filePath));
        $header = array_shift($rows);

        return array_map(fn($row) => array_combine($header, $row), $rows);
    }
}

if (!function_exists('get_user_access_field')) {
    function get_user_access_field($data, $type)
    {
        switch ($type) {
            case 'student':
                return array_merge($data, [
                    'allow_complaint' => 1,
                    'allow_absent_form' => 1,
                    'allow_appointment' => 1,
                    'allow_gatepass' => 1,
                ]);
            case 'super_admin':
                return array_merge($data, [
                    'allow_complaint' => 1,
                    'allow_gatepass' => 1,
                ]);
            case 'non_teaching_staff':
                return array_merge($data, [
                    'allow_complaint' => 1,
                    'allow_gatepass' => 1,
                ]);
            case 'program_head':
            case 'faculty':
                return array_merge($data, [
                    'allow_complaint' => 1,
                    'allow_referral' => 1,
                    'allow_gatepass' => 1,
                ]);
            case 'parent':
                return array_merge($data, [
                    'allow_complaint' => 1,
                    'allow_appointment' => 1,
                ]);
            default:
                return array_merge($data, [
                    'allow_complaint' => 1,
                    'allow_referral' => 1,
                    'allow_absent_form' => 1,
                    'allow_appointment' => 1,
                    'allow_gatepass' => 1,
                ]);
        }
    }
}

if (!function_exists('archive_retention_date')) {
    /**
     * The date an archived record becomes eligible for deletion —
     * config('app.archive_retention_years') years from now. Every place
     * that archives a complaint/referral/absent-form/gate-pass/appointment
     * should compute archived_at through this, not a hardcoded addYears(5),
     * so changing the retention setting affects everything consistently.
     */
    function archive_retention_date(): \Carbon\Carbon
    {
        return now()->addYears((int) config('app.archive_retention_years', 5));
    }
}

if (!function_exists('encrypt_id')) {
    /**
     * A URL-safe encrypted token for a numeric ID — used wherever an ID
     * travels through a GET route segment or query string instead of a
     * raw, sequential, enumerable integer. Crypt::encryptString()'s own
     * output uses the standard (+ / =) base64 alphabet; only +/ are
     * swapped for the URL-safe -_ pair. The '=' padding is deliberately
     * left untouched (it's already valid unencoded in both a URL path
     * segment and a query string per RFC 3986) — stripping and later
     * recomputing it from the token's length was tried and is NOT safe:
     * it lets a tampered/appended suffix land in its own aligned base64
     * group that decodes independently of the real payload, which
     * Crypt::decryptString's json_decode() then silently ignores as
     * trailing garbage instead of failing the MAC check.
     */
    function encrypt_id(int|string $id): string
    {
        return strtr(Crypt::encryptString((string) $id), '+/', '-_');
    }
}

if (!function_exists('decrypt_id')) {
    /**
     * Reverses encrypt_id(). Returns null (instead of throwing) on a
     * missing/malformed/tampered token so route handlers can abort(404)
     * instead of leaking a stack trace to someone poking at the URL by
     * hand.
     */
    function decrypt_id(?string $token): ?int
    {
        if (!$token) {
            return null;
        }

        try {
            $value = Crypt::decryptString(strtr($token, '-_', '+/'));

            return ctype_digit($value) ? (int) $value : null;
        } catch (\Illuminate\Contracts\Encryption\DecryptException) {
            return null;
        }
    }
}

if (!function_exists('can_see_incident_summary')) {
    /**
     * The incident summary (shown as "Prefect's Remark") is the prefect's
     * own write-up — only the prefect (sub_admin) sees it. Everyone else
     * (the student, parent, staff, even the super admin) gets it hidden.
     */
    function can_see_incident_summary(): bool
    {
        return auth()->user()?->role === 'sub_admin';
    }
}

if (!function_exists('clean_rich_text')) {
    /**
     * Rich-text HTML from the app's editor, reduced to the formatting tags it
     * produces: no scripts, event handlers or javascript: links.
     */
    function clean_rich_text(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }
        $clean = strip_tags($html, '<p><br><strong><b><em><i><u><s><ul><ol><li><h1><h2><h3><blockquote>');
        $clean = preg_replace('/\s(on\w+|style)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $clean);

        return preg_replace('/javascript\s*:/i', '', $clean);
    }
}

if (!function_exists('default_password')) {
    /**
     * A new account's starting password: last name and ID number, lowercase,
     * no spaces — "Dela Cruz" + "C2210213" -> "delacruz_c2210213". Mirrored
     * in register/main-form.jsx (defaultPassword) for the preview.
     */
    function default_password(?string $lastName, ?string $idNumber): string
    {
        // Accents dropped too ("Peña" -> "pena"), like registration_username().
        $part = fn ($v) => strtolower(preg_replace('/\s+/', '', \Illuminate\Support\Str::ascii((string) $v)));

        return $part($lastName).'_'.$part($idNumber);
    }
}

if (!function_exists('registration_username')) {
    /**
     * A new account's username: first name + last name + 4 random digits,
     * lowercase letters and digits only — "Juan" "Dela Cruz" -> "juandelacruz4821".
     * Retries until it's not taken.
     */
    function registration_username(?string $firstName, ?string $lastName): string
    {
        $base = preg_replace('/[^a-z0-9]/', '', strtolower(\Illuminate\Support\Str::ascii((string) $firstName.(string) $lastName)));
        if ($base === '') {
            $base = 'user';
        }
        do {
            $username = $base.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (\App\Models\User::where('username', $username)->exists());

        return $username;
    }
}
