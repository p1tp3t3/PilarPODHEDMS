<?php

namespace App\Http\Controllers;

use App\Events\NotifyUser;
use App\Mail\CallInMail;
use App\Mail\ProgramHeadCallInMail;
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
    public function index() {
        $notif = new Notifications();

        $notif = (isset($_GET['id'])) ? $notif->with(['sender.profile', 'receiver.profile'])->where('id', $_GET['id'])->first() : null;
        $receiverId = $notif != null ? $notif->receiver_id : 0;

        if((isset($_GET['id']) && $notif == null)) {
            abort(404);
        }else {
            if(empty($notif->read_since) && $receiverId == auth()->id()) {
                $data = [
                    'type' => 'select-one',
                    'id' => $notif->id
                ];
                $data = new Request($data);
                self::markAsRead($data);
            }
        }

        $type = ($notif != null) ? str_replace("_", '-', $notif->notif_type) : '';
        $filePath = ($notif != null) ? "other/notification/$type" : "other/notification";

        return Inertia::render($filePath, [
            'user' => auth()->user(),
            'notification' => Notifications::where('receiver_id',  auth()->id())
                              ->latest('created_at')
                              ->limit(10)
                              ->get(),
            'size' => Notifications::where('receiver_id',  auth()->id())->count(),
            'notif' => $notif,
        ]);
    }
    public function notifTypeIndex($id) {
        $notif = Notifications::with(['sender', 'receiver'])->where('id', $id)->first();
        if($notif == null) {
            abort(404);
        }

        $type = str_replace("_", '-', $notif->notif_type);
        return Inertia::render("other/notification/$type", [
            'user' => auth()->user(),
            'notification' => $notif
        ]);
    }
    public function notifyCallIn(Request $request)
    {
        DB::beginTransaction(); // << Start Transaction

        try {
            // Basic data
            $data = [
                'notif_type'   => 'call_in',
                'sender_id'    => $request->sender_id,
                'receiver_id'  => $request->receiver_id,
                'content'      => 'c',
            ];

            $prefect = User::where('role', 'sub_admin')
                ->where('id', $data['sender_id'])
                ->with('profile')
                ->firstOrFail();

            // A student can only be called in if they're an enrolled,
            // activated account — not just any row with role='student'.
            $student = User::where('role', 'student')
                ->where('id', $data['receiver_id'])
                ->where('activate', true)
                ->whereHas('enrollment')
                ->with(['profile', 'program'])
                ->firstOrFail();

            /** Get Program Head if enabled **/
            $programHead = null;
            if ($request->boolean('notify_program_head') && $student->program) {
                $programHead = User::where('role', 'teaching_staff')
                    ->whereHas('teachingStaff', function ($q) use ($student) {
                        $q->where('program_id', $student->program->id)
                          ->where('position', 'program_head');
                    })
                    ->with('profile')
                    ->first();
            }

            /** EMAIL DATA */
            $emailNotifData = [
                'prefect' => "{$prefect->profile?->first_name} {$prefect->profile?->last_name}",
                'student' => "{$student->profile?->first_name} {$student->profile?->last_name}",
                'reason'  => $request->call_in_reason,
            ];


            /** Store notification before sending email */
            $id = Notifications::insertGetId($data);

            Notifications::where('id', $id)->update([
                'content' => json_encode([
                    'id'                      => $id,
                    'is_program_head' => false,
                    'sender_notif_message'    => 'You called in a student.',
                    'receiver_notif_message'  => $request->call_in_reason
                ])
            ]);

            /** Email Sending - rollback on failure */
            Mail::to($student->email)->send(new CallInMail($emailNotifData));

            /** WebPush to student */
            send_web_push([
                'title' => 'Hello ' . $student->profile?->first_name,
                'body'  => 'You have been called in by the office of the prefect.',
                'icon'  => '',
                'url'   => "/notification/$id"
            ], $student->id);

            /** WebPush to Program Head (if enabled) */
            if ($programHead && $request->boolean('notify_program_head')) {
                $programHeadNotifId = Notifications::insertGetId([
                    'sender_id' => auth()->id(),
                    'receiver_id' => $programHead->id,
                    'notif_type' => 'call_in',
                    'content' => 'c'
                ]);

                Notifications::where('id', $programHeadNotifId)->update([
                    'content' => json_encode([
                        'id' => $programHeadNotifId,
                        'is_program_head' => true,
                        'sender_notif_message'    => 'You notify the program head about the called in a student.',
                        'receiver_notif_message'  => "This is to formally inform your office about your student {$student->profile?->first_name} {$student->profile?->middle_name} {$student->profile?->last_name} who is being called in by the office of the prefect. Please inform your student to visit to the office due to confidential reasons."
                    ])
                ]);

                send_web_push([
                    'title' => 'Student Call-In Notice',
                    'body'  => "{$student->profile?->first_name} {$student->profile?->last_name} has been called in by the office of the prefect.",
                    'icon'  => '',
                    'url'   => "/notification/$id"
                ], $programHead->id);
                $dataProg = [
                    'program_head_name' => $programHead->profile?->first_name . ' ' . $programHead->profile?->last_name,
                    'date_reported' => Carbon::parse(now())->format('Y-d-m'),
                    'student_name' => $student->profile?->first_name . ' ' . $student->profile?->last_name,
                    'program' => $student->program->name ?? null
                ];
                Mail::to($programHead->email)
                    ->send(new ProgramHeadCallInMail($dataProg));

                broadcast(new NotifyUser($programHead->id));
            }

            /** Broadcast event */
            broadcast(new NotifyUser($data['receiver_id']));

            /** Action Log */
            ActionLog::create([
                'user_id'     => auth()->id(),
                'action_type' => 'call-in',
                'details'     => 'calls in a student for office call'
            ]);

            DB::commit(); // << Commit Transaction
            return response()->json(['message' => 'success']);

        } catch (\Exception $e) {

            DB::rollBack(); // << Rollback all DB changes

            // Delete stored notification if created
            if (isset($id)) {
                Notifications::where('id', $id)->delete();
            }

            return response()->json([
                'message' => 'Failed to complete call-in notification.',
                'error'   => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 400);
        }
    }


    public function notifyViolationRisk(Request $request) {
        $program = $request->program;
        $faculty = User::with('faculty')->whereHas('faculty', function($q) use ($program) {
                                         $q->where('program_id', $program);
                                      })->where('user_type', 'faculty')
                                        ->get();
        $programDean = User::with('administrative')->whereHas('administrative', function($q) use ($program) {
                                                    $q->where('type', 'program_dean')
                                                      ->where('program_id', $program);
                                                 })->where('user_type', 'administrative')
                                                  ->first();
        
    }
    public function markAsRead(Request $request) {
        $userId = auth()->id();
        $read = [ 'read_since' => DB::raw("CURRENT_TIMESTAMP") ];
        
        $notif = Notifications::where('receiver_id', $userId);

        switch($request->type) {
            case 'select-one':
                if(empty($notif->where('id', $request->id)->first()->read_since)) {
                    $notif->where('id', $request->id)
                          ->update($read);
                }
                break;
            case 'select-multiple':
                foreach($request->notif_id_list as $id) {
                    $notif->where('id', $id)
                          ->update($read);
                }
                break;
            case 'select-all':
                $notif->where('read_since', NULL)
                      ->update($read);
                break;
        }
        return self::getNotif($userId, 4);
    }
    public function destroy(Request $request, $type) {
        $userId = auth()->id();
        $notif = Notifications::where('receiver_id', $userId);

        switch($type) {
            case 'select-one':
                $notif->where('id', $request->id)->delete();
                break;
            case 'select-multiple':
                $notif->whereIn('id', $request->notif_id_list)->delete();
                break;
        }

        return Notifications::where('receiver_id', $userId)->latest('created_at')->limit(10)->get();
    }
    public function notifyFacultyProgramHead(Request $request) {
        return response()->json($request->all());        
    }
    public function getNotif($receiver, $l) {
        $notif = Notifications::where('receiver_id', $receiver)
                            ->latest('created_at')
                            ->limit($l)
                            ->get();
        $unreadCount = $notif->whereNull('read_since')->count();

        return response()->json([
            'unread_count' => $unreadCount,
            'notif' =>  $notif,
            'size' => Notifications::where('receiver_id',  $receiver)->count(),
        ]);
    }
    public function getNotifType($type, $id, $lim = 4) {
        $notif = new Notifications();
        $unreadCount = $notif->where('receiver_id', $id)->whereNull('read_since')->count();
        switch($type) {
            case 'all':
                $notif = $notif;
                break;
            case 'unread':
                $notif = $notif->whereNull('read_since');
                break;
        }
        return [
            'unread_count' => $unreadCount,
            'notif' => $notif->where('receiver_id', $id)->latest('created_at')->limit($lim)->get(),
            'size' => $notif->where('receiver_id',  $id)->count(),
        ];
    }
    public function getStudentNotification($type) {
        switch($type) {
            case 'callin':
                return self::getStudentCallInNotification();
            case 'appointment':
                return self::getUserAppointmentNotification();
        }
    }
    public function getStudentCallInNotification() {
        $notif = Notifications::with(['receiver.program', 'receiver.profile', 'receiver.enrollments'])
                              ->whereHas('receiver', function($q) {
                                $q->where('role', 'student');
                              })
                              ->where('notif_type', 'call_in')
                              ->latest('created_at')
                              ->get()
                              ->toArray();
        return $notif;
    }
    public function getUserAppointmentNotification() {
        $notif = Notifications::with(['receiver.program', 'receiver.parent', 'receiver.profile', 'receiver.enrollments'])
                              ->where('notif_type', 'appointment')
                              ->whereNot('receiver_id', auth()->user()->id)
                              ->latest('created_at')
                              ->get()
                              ->toArray();
        return $notif;
    }
    private function getFields($request, $type) {
        return [
            'notif_type' => $type,
            'sender_id' => $request->sender,
            'receiver_id' => $request->receiver,
            'content' => $request->content,
            'read_since' => NULL,
        ];
    }
}
