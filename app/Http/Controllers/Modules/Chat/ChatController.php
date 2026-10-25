<?php

namespace App\Http\Controllers\Modules\Chat;

use App\Events\MessageEdited;
use App\Events\MessageSent;
use App\Events\MessagesRead;
use App\Events\MessageUnsent;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\ProgramHeadProgram;
use App\Models\Message;
use App\Models\MessageEdit;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ChatController extends Controller
{
    private const ADMIN_ROLES = ['sub_admin', 'super_admin'];

    /**
     * Who may chat with whom (the same rule both ways):
     * - IT admin (super_admin): everyone;
     * - prefect (sub_admin): everyone (parents included);
     * - program head: the students of the program(s) they head;
     * - student: their program head, the prefect and the IT admin;
     * - teaching staff (faculty): the prefect and the IT admin (not their
     *   program head, each other, or students);
     * - non-teaching staff: the prefect and the IT admin;
     * - parent: the prefect and the IT admin.
     */
    private function canChat(User $a, User $b): bool
    {
        if ($a->id === $b->id) {
            return false;
        }

        $roles = [$a->role, $b->role];

        if (in_array('super_admin', $roles, true)) {
            return true;
        }

        if (in_array('sub_admin', $roles, true)) {
            return true;
        }

        return $this->headsProgramOf($a, $b) || $this->headsProgramOf($b, $a);
    }

    // Whether $head is the program head of a program $other belongs to
    // (a student's latest-enrollment program, or a teacher's program).
    private function headsProgramOf(User $head, User $other): bool
    {
        if ($head->role !== 'teaching_staff') {
            return false;
        }

        $headed = $this->headedProgramIds($head);
        if ($headed->isEmpty()) {
            return false;
        }

        // Only students — a program head doesn't chat with the faculty.
        $programs = $other->role === 'student'
            ? $this->latestProgramIds(collect([$other->id]))
            : collect();

        return $headed->intersect($programs)->isNotEmpty();
    }

    // Programs this user is the program head of.
    private function headedProgramIds(User $user)
    {
        return ProgramHeadProgram::where('user_id', $user->id)->pluck('program_id');
    }

    // Program heads of these programs.
    private function headsOfPrograms($programIds)
    {
        return ProgramHeadProgram::whereIn('program_id', $programIds)->pluck('user_id');
    }

    private function latestProgramIds($studentIds)
    {
        return Enrollment::whereIn('id', Enrollment::whereIn('student_id', $studentIds)
            ->selectRaw('MAX(id)')
            ->groupBy('student_id'))
            ->pluck('program_id')
            ->filter()
            ->unique()
            ->values();
    }

    // Students whose latest enrollment is in one of these programs.
    private function studentsInPrograms($programIds)
    {
        return Enrollment::whereIn('id', Enrollment::selectRaw('MAX(id)')->groupBy('student_id'))
            ->whereIn('program_id', $programIds)
            ->pluck('student_id');
    }

    public function index()
    {
        return Inertia::render('chat/index', [
            'contacts' => $this->getContacts(),
        ]);
    }

    /**
     * Contacts = everyone the user is allowed to start a chat with (see
     * canChat) plus anyone they've already talked to, ranked by most recent
     * activity. Admins don't get a pre-filled list of every user — they get
     * the other admins plus their conversations, and search for the rest.
     */
    private function getContacts()
    {
        $me = auth()->user();

        $partnerIds = Message::where('receiver_id', $me->id)->pluck('sender_id')
            ->merge(Message::where('sender_id', $me->id)->pluck('receiver_id'));

        // Always the IT admin and the prefect, plus: a student's program head,
        // and for a program head, the students of the programs they head.
        $suggestedIds = User::whereRole(self::ADMIN_ROLES)->pluck('id');

        if ($me->role === 'student') {
            $suggestedIds = $suggestedIds->merge($this->headsOfPrograms($this->latestProgramIds(collect([$me->id]))));
        } elseif ($me->role === 'teaching_staff') {
            $headed = $this->headedProgramIds($me);
            // A program head is suggested their program's students (not its faculty).
            $suggestedIds = $suggestedIds->merge($this->studentsInPrograms($headed));
        }

        $contactIds = $suggestedIds->merge($partnerIds)
            ->unique()
            ->reject(fn ($id) => $id === $me->id)
            ->values();

        $contacts = User::with(['profile', 'program', 'enrollments', 'teachingStaff.program', 'nonTeachingStaff'])
            ->whereIn('id', $contactIds)->get()
            ->filter(fn (User $contact) => $this->canChat($me, $contact));

        return $contacts->map(function ($contact) use ($me) {
            $lastMessage = Message::where(function ($q) use ($me, $contact) {
                $q->where('sender_id', $me->id)->where('receiver_id', $contact->id);
            })
                ->orWhere(function ($q) use ($me, $contact) {
                    $q->where('sender_id', $contact->id)->where('receiver_id', $me->id);
                })
                ->latest('created_at')
                ->first();

            return [
                'id' => $contact->id,
                'encrypted_id' => encrypt_id($contact->id),
                'username' => $contact->username,
                'role' => $contact->role,
                'profile' => $contact->profile,
                'program' => $contact->program,
                'enrollments' => $contact->enrollments,
                'teaching_staff' => $contact->teachingStaff,
                'non_teaching_staff' => $contact->nonTeachingStaff,
                'last_seen' => $contact->last_seen,
                'last_message' => $lastMessage
                    ? ($lastMessage->unsent_at ? 'Message unsent' : $lastMessage->body)
                    : null,
                'last_message_at' => $lastMessage?->created_at,
                'unread_count' => Message::where('sender_id', $contact->id)
                    ->where('receiver_id', $me->id)
                    ->whereNull('read_at')
                    ->count(),
            ];
        })->sortByDesc('last_message_at')->values();
    }

    public function getThread($userId)
    {
        $userId = decrypt_id($userId) ?? abort(404);

        $me = auth()->user();
        $contact = User::with(['profile', 'program', 'enrollments', 'teachingStaff.program', 'nonTeachingStaff'])->findOrFail($userId);

        if (! $this->canChat($me, $contact)) {
            return response()->json(['message' => 'You cannot message this user.'], 403);
        }

        $readAt = now();
        $justRead = Message::where('sender_id', $contact->id)
            ->where('receiver_id', $me->id)
            ->whereNull('read_at')
            ->update(['read_at' => $readAt]);

        if ($justRead > 0) {
            broadcast(new MessagesRead($contact->id, $me->id, $readAt->toJSON()));
        }

        $messages = Message::with('replyTo.sender.profile')
            ->where(function ($q) use ($me, $contact) {
                $q->where('sender_id', $me->id)->where('receiver_id', $contact->id);
            })
            ->orWhere(function ($q) use ($me, $contact) {
                $q->where('sender_id', $contact->id)->where('receiver_id', $me->id);
            })
            ->orderBy('created_at')
            ->get();

        $this->scrubUnsent($messages);

        return response()->json([
            'contact' => $contact,
            'messages' => $messages,
        ]);
    }

    /**
     * Unsending never deletes the row (so reply_to references from the
     * other side stay valid) — it just blanks what gets served out.
     */
    private function scrubUnsent($messages)
    {
        foreach ($messages as $m) {
            if ($m->replyTo && $m->replyTo->unsent_at) {
                $m->replyTo->body = null;
            }
            if ($m->unsent_at) {
                $m->body = null;
            }
        }
    }

    public function unsendMessage($id)
    {
        $message = Message::find($id);

        if (! $message) {
            return response()->json(['message' => 'Message not found.'], 404);
        }
        if ($message->sender_id !== auth()->id()) {
            return response()->json(['message' => 'You can only unsend your own message.'], 403);
        }
        if ($message->unsent_at !== null) {
            return response()->json(['message' => 'Message already unsent.'], 400);
        }

        $message->update(['unsent_at' => now()]);

        broadcast(new MessageUnsent($message->receiver_id, $message->id));

        return response()->json(['message' => 'Message unsent.']);
    }

    public function editMessage(Request $request, $id)
    {
        $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $message = Message::find($id);

        if (! $message) {
            return response()->json(['message' => 'Message not found.'], 404);
        }
        if ($message->sender_id !== auth()->id()) {
            return response()->json(['message' => 'You can only edit your own message.'], 403);
        }
        if ($message->unsent_at !== null) {
            return response()->json(['message' => 'This message was unsent.'], 400);
        }

        $newBody = trim($request->body);
        if ($newBody === $message->body) {
            return response()->json(['message' => $message]);
        }

        // Archive the pre-edit text before overwriting it, so both sides
        // can look back at every prior version.
        $history = MessageEdit::create([
            'message_id' => $message->id,
            'body' => $message->body,
        ]);
        $history->created_at = now();
        $history->save();

        $editedAt = now();
        $message->update([
            'body' => $newBody,
            'edited_at' => $editedAt,
        ]);

        broadcast(new MessageEdited($message->receiver_id, $message->id, $newBody, $editedAt->toJSON()));

        return response()->json(['message' => $message]);
    }

    public function getEditHistory($id)
    {
        $id = decrypt_id($id) ?? abort(404);

        $message = Message::findOrFail($id);
        $me = auth()->user();

        if ($message->sender_id !== $me->id && $message->receiver_id !== $me->id) {
            return response()->json(['message' => 'You cannot view this message.'], 403);
        }

        return response()->json([
            'current' => $message->unsent_at ? null : $message->body,
            // edits() is ordered oldest-first for the archive as a whole;
            // query fresh here since we only want the single most recent
            // one. Ordered by id, not created_at — two edits landing in
            // the same second would otherwise tie and pick arbitrarily.
            'previous' => MessageEdit::where('message_id', $message->id)->latest('id')->first(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|integer|exists:users,id',
            'body' => 'required|string|max:5000',
            'reply_to_id' => 'nullable|integer|exists:message,id',
        ]);

        $me = auth()->user();
        $receiver = User::findOrFail($request->receiver_id);

        if (! $this->canChat($me, $receiver)) {
            return response()->json(['message' => 'You cannot message this user.'], 403);
        }

        $replyToId = null;
        if ($request->reply_to_id) {
            // Only allow quoting a message that's actually part of this
            // same conversation — stops replying to a message pulled from
            // an unrelated thread.
            $replyTo = Message::find($request->reply_to_id);
            $belongsToThread = $replyTo && (
                ($replyTo->sender_id === $me->id && $replyTo->receiver_id === $receiver->id) ||
                ($replyTo->sender_id === $receiver->id && $replyTo->receiver_id === $me->id)
            );
            $replyToId = $belongsToThread ? $replyTo->id : null;
        }

        $message = Message::create([
            'sender_id' => $me->id,
            'receiver_id' => $receiver->id,
            'reply_to_id' => $replyToId,
            'body' => trim($request->body),
        ]);

        // Message doesn't use Eloquent timestamps (created_at is a plain
        // DB-default column instead, and deliberately left out of
        // $fillable so it can't be spoofed via mass assignment) — set it
        // directly so the in-memory object broadcast to the recipient
        // has it, instead of a null that isn't even in the DB row.
        $message->created_at = now();

        broadcast(new MessageSent($message));

        return response()->json(['message' => $message]);
    }

    public function unreadCount()
    {
        return response()->json([
            'unread_count' => Message::where('receiver_id', auth()->id())
                ->whereNull('read_at')
                ->count(),
        ]);
    }
}
