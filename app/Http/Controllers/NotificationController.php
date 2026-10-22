<?php

namespace App\Http\Controllers;

use App\Events\NotifyUser;
use App\Mail\CallInMail;
use App\Models\ActionLog;
use App\Models\Notifications;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

use function Symfony\Component\Clock\now;

class NotificationController extends Controller
{
    public function index()
    {
        // ?id= is the notification's encrypted id — read through request()
        // so DecryptEncryptedIds has turned it back into the plain id (raw
        // $_GET skipped that). Only the receiver may open a notification.
        $requestedId = request()->query('id');
        $notif = $requestedId !== null
            ? Notifications::with(['sender.profile', 'receiver.profile'])->where('id', $requestedId)->first()
            : null;
        $receiverId = $notif != null ? $notif->receiver_id : 0;

        if ($requestedId !== null && ($notif == null || (int) $receiverId !== (int) auth()->id())) {
            abort(404);
        } else {
            if (empty($notif->read_since) && $receiverId == auth()->id()) {
                $data = [
                    'type' => 'select-one',
                    'id' => $notif->id,
                ];
                $data = new Request($data);
                self::markAsRead($data);
            }
        }

        $type = ($notif != null) ? str_replace('_', '-', $notif->notif_type) : '';
        $filePath = ($notif != null) ? "other/notification/$type" : 'other/notification';

        return Inertia::render($filePath, [
            'notification' => Notifications::where('receiver_id', auth()->id())
                ->latest('created_at')
                ->limit(10)
                ->get(),
            'size' => Notifications::where('receiver_id', auth()->id())->count(),
            'notif' => $notif,
        ]);
    }

    public function notifTypeIndex($id)
    {
        $notif = Notifications::with(['sender', 'receiver'])->where('id', $id)->first();
        if ($notif == null) {
            abort(404);
        }

        $type = str_replace('_', '-', $notif->notif_type);

        return Inertia::render("other/notification/$type", [
            'notification' => $notif,
        ]);
    }

    public function notifyCallIn(Request $request)
    {
        DB::beginTransaction(); // << Start Transaction

        try {
            // Basic data
            $data = [
                'notif_type' => 'call_in',
                'sender_id' => $request->sender_id,
                'receiver_id' => $request->receiver_id,
                'content' => 'c',
            ];

            $prefect = User::whereRole('sub_admin')
                ->where('id', $data['sender_id'])
                ->with('profile')
                ->firstOrFail();

            // A student can only be called in if they're an enrolled,
            // activated account — not just any row with role='student'.
            $student = User::whereRole('student')
                ->where('id', $data['receiver_id'])
                ->where('activate', true)
                ->whereHas('enrollment')
                ->with(['profile', 'program'])
                ->firstOrFail();

            /** EMAIL DATA */
            $emailNotifData = [
                'prefect' => "{$prefect->profile?->first_name} {$prefect->profile?->last_name}",
                'student' => "{$student->profile?->first_name} {$student->profile?->last_name}",
                'reason' => $request->call_in_reason,
            ];

            /** Store notification before sending email */
            $id = Notifications::insertGetId($data);

            Notifications::where('id', $id)->update([
                'content' => json_encode([
                    'id' => $id,
                    'is_program_head' => false,
                    'sender_notif_message' => 'You called in a student.',
                    'receiver_notif_message' => $request->call_in_reason,
                ]),
            ]);

            /** Email Sending - rollback on failure */
            Mail::to($student->email)->send(new CallInMail($emailNotifData));

            /** Broadcast event */
            broadcast(new NotifyUser($data['receiver_id']));

            /** Action Log */
            ActionLog::create([
                'user_id' => auth()->id(),
                'action_type' => 'call-in',
                'details' => 'calls in a student for office call',
            ]);

            DB::commit(); // << Commit Transaction

            return response()->json(['message' => 'success']);

        } catch (Exception $e) {

            DB::rollBack(); // << Rollback all DB changes

            // Delete stored notification if created
            if (isset($id)) {
                Notifications::where('id', $id)->delete();
            }

            return response()->json([
                'message' => 'Failed to complete call-in notification.',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 400);
        }
    }

    public function notifyViolationRisk(Request $request)
    {
        $program = $request->program;
        $faculty = User::with('faculty')->whereHas('faculty', function ($q) use ($program) {
            $q->where('program_id', $program);
        })->where('user_type', 'faculty')
            ->get();
        $programDean = User::with('administrative')->whereHas('administrative', function ($q) use ($program) {
            $q->where('type', 'program_dean')
                ->where('program_id', $program);
        })->where('user_type', 'administrative')
            ->first();

    }

    public function markAsRead(Request $request)
    {
        $userId = auth()->id();
        $read = ['read_since' => DB::raw('CURRENT_TIMESTAMP')];

        // A fresh query each time: reusing one builder kept stacking
        // where('id', ...) clauses, so only the first selected one was marked.
        $mine = fn () => Notifications::where('receiver_id', $userId)->whereNull('read_since');

        switch ($request->type) {
            case 'select-one':
                $mine()->where('id', $request->id)->update($read);
                break;
            case 'select-multiple':
                $mine()->whereIn('id', (array) $request->notif_id_list)->update($read);
                break;
            case 'select-all':
                $mine()->update($read);
                break;
        }

        return self::getNotif(encrypt_id($userId), 4);
    }

    public function destroy(Request $request, $type)
    {
        $userId = auth()->id();
        $notif = Notifications::where('receiver_id', $userId);

        switch ($type) {
            case 'select-one':
                $notif->where('id', $request->id)->delete();
                break;
            case 'select-multiple':
                $notif->whereIn('id', $request->notif_id_list)->delete();
                break;
        }

        return Notifications::where('receiver_id', $userId)->latest('created_at')->limit(10)->get();
    }

    public function notifyFacultyProgramHead(Request $request)
    {
        return response()->json($request->all());
    }

    /**
     * The user id in these notification URLs is the user's encrypted id; it
     * must be the signed-in user's own (it used to be a plain id that was
     * trusted, so anyone could read anyone's notifications).
     */
    private function ownUserIdOrAbort($encryptedId): int
    {
        $userId = decrypt_id($encryptedId) ?? abort(404);
        abort_unless($userId === (int) auth()->id(), 403);

        return $userId;
    }

    /** The latest notifications for the header badge/dropdown. */
    public function getNotif($receiver, $l)
    {
        $userId = $this->ownUserIdOrAbort($receiver);
        $limit = min(max((int) $l, 1), 200);

        return response()->json([
            'unread_count' => Notifications::where('receiver_id', $userId)->whereNull('read_since')->count(),
            'notif' => Notifications::where('receiver_id', $userId)->latest('created_at')->limit($limit)->get(),
            'size' => Notifications::where('receiver_id', $userId)->count(),
        ]);
    }

    /**
     * 'all' or 'unread' notifications, newest first, for the notifications
     * page and dropdown. `size` is the total in that list (for "load more").
     */
    public function getNotifType($type, $id, $lim = 4)
    {
        $userId = $this->ownUserIdOrAbort($id);
        $limit = min(max((int) $lim, 1), 200);
        $list = fn () => Notifications::where('receiver_id', $userId)
            ->when($type === 'unread', fn ($q) => $q->whereNull('read_since'));

        return [
            'unread_count' => Notifications::where('receiver_id', $userId)->whereNull('read_since')->count(),
            'notif' => $list()->latest('created_at')->limit($limit)->get(),
            'size' => $list()->count(),
        ];
    }

    public function getStudentNotification($type)
    {
        switch ($type) {
            case 'callin':
                return self::getStudentCallInNotification();
            case 'appointment':
                return self::getUserAppointmentNotification();
        }
    }

    public function getStudentCallInNotification()
    {
        $notif = Notifications::with(['receiver.program', 'receiver.profile', 'receiver.enrollments'])
            ->whereHas('receiver', function ($q) {
                $q->whereRole('student');
            })
            ->where('notif_type', 'call_in')
            ->latest('created_at')
            ->get()
            ->toArray();

        return $notif;
    }

    public function getUserAppointmentNotification()
    {
        $notif = Notifications::with(['receiver.program', 'receiver.parent', 'receiver.profile', 'receiver.enrollments'])
            ->where('notif_type', 'appointment')
            ->whereNot('receiver_id', auth()->user()->id)
            ->latest('created_at')
            ->get()
            ->toArray();

        return $notif;
    }

    private function getFields($request, $type)
    {
        return [
            'notif_type' => $type,
            'sender_id' => $request->sender,
            'receiver_id' => $request->receiver,
            'content' => $request->content,
            'read_since' => null,
        ];
    }
}
