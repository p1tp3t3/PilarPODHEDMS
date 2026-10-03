<?php

use App\Events\NotifyUser;
use App\Models\Notifications;
use App\Models\Position;
use App\Models\TeachingStaff;
use App\Models\User;
use App\Notifications\WebPushGenericNotification;
use Illuminate\Support\Facades\Log;

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
     * Insert a notification row, broadcast it, and fire a web-push derived
     * straight from that same row (a web-push failure must never block or
     * roll back the notification itself). Deriving the push payload here
     * instead of taking it as a separate parameter means every single
     * caller gets a push automatically — no call site has to remember to
     * build one.
     */
    function notify_single_user($notifField, $broadcast = null)
    {
        Notifications::insert($notifField);
        broadcast(new NotifyUser($notifField['receiver_id']));

        try {
            send_web_push_for_notification($notifField);
        } catch (\Exception $e) {
            Log::error('WebPush failed: '.$e->getMessage());
        }
    }
}

if (!function_exists('send_web_push_for_notification')) {
    /**
     * Title comes from notif_type, body from the notification's own
     * receiver_notif_message — the same content every in-app notification
     * already carries, so nothing new has to be authored per call site.
     * The link always opens the in-app notification center rather than
     * guessing a role-specific deep link (the receiver's role varies by
     * notif_type, and /notifications is reachable by every role).
     */
    function send_web_push_for_notification(array $notifField): void
    {
        $content = json_decode($notifField['content'] ?? '', true) ?: [];
        $body = $content['receiver_notif_message'] ?? $content['sender_notif_message'] ?? null;

        if (!$body || empty($notifField['receiver_id'])) {
            return;
        }

        $titles = [
            'complaint' => 'Complaint',
            'referral' => 'Referral',
            'absent' => 'Absent Form',
            'violation' => 'Violation',
            'appointment' => 'Appointment',
            'gatepass' => 'Gate Pass',
            'call_in' => 'Call In',
            'user' => 'Notification',
            'violation_access' => 'Violation Access Request',
            'semester_summary' => 'Semester Summary',
            'maintenance_notice' => 'Maintenance Notice',
        ];

        send_web_push([
            'title' => $titles[$notifField['notif_type'] ?? ''] ?? 'New Notification',
            'body' => $body,
            'icon' => '',
            'url' => '/notifications',
        ], $notifField['receiver_id']);
    }
}

if (!function_exists('send_web_push')) {
    /**
     * Push a web notification to every subscription registered for
     * $userId via Laravel's own WebPush channel (VAPID keys in .env).
     * Expired/unsubscribed subscriptions are pruned automatically by the
     * package's ReportHandler.
     */
    function send_web_push($payload, $userId)
    {
        $user = User::find($userId);

        if (!$user) {
            return;
        }

        $user->notify(new WebPushGenericNotification([
            'title' => $payload['title'],
            'body' => $payload['body'],
            'icon' => ($payload['icon'] == '' || $payload['icon'] == null)
                      ? '/default-pic/pilar.png'
                      : $payload['icon'],
            'url' => $payload['url'],
        ]));
    }
}

if (!function_exists('is_program_head')) {
    /**
     * The authenticated user's program name(s) if they're a program head,
     * else null — a program head can now be responsible for 2+ programs
     * (program_head_program), so this joins every one of them rather than
     * only their "home" teaching_staff.program_id.
     */
    function is_program_head()
    {
        $admin = TeachingStaff::where('user_id', auth()->user()->id)
                            ->where('position_id', Position::idFor('program_head'))
                            ->first();

        if (!$admin) {
            return null;
        }

        $names = $admin->programsHandled->pluck('name');

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
    function get_user_access_field($data = null, $type)
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
            case 'teaching_staff':
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
