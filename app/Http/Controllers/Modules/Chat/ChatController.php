<?php

namespace App\Http\Controllers\Modules\Chat;

use App\Events\GroupMessageSent;
use App\Events\MessageEdited;
use App\Events\MessageSent;
use App\Events\MessagesRead;
use App\Events\MessageUnsent;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\FamilyMember;
use App\Models\GroupMessage;
use App\Models\Program;
use App\Models\Message;
use App\Models\MessageEdit;
use App\Models\TeachingStaff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ChatController extends Controller
{
    private const ADMIN_ROLES = ['sub_admin', 'super_admin'];

    /**
     * Who may chat with whom ("program" = a teacher's own program or one they
     * head; a student's program = their latest enrollment's):
     * - the IT admin and the prefect can chat with anyone (and everyone can
     *   chat with them);
     * - a student and a teaching staff member, when the student is in one of
     *   that teacher's programs;
     * - two teaching staff members who share a program;
     * - a parent and a teaching staff member, when one of the parent's
     *   children is in one of that teacher's programs;
     * - anything else (e.g. non-teaching staff with anyone but the admins)
     *   is not allowed.
     */
    private function canChat(User $a, User $b): bool
    {
        if (in_array($a->role, self::ADMIN_ROLES) || in_array($b->role, self::ADMIN_ROLES)) {
            return true;
        }

        $pair = collect([$a->role, $b->role])->sort()->values()->all();

        if ($pair === ['student', 'teaching_staff']) {
            [$student, $teacher] = $a->role === 'student' ? [$a, $b] : [$b, $a];

            return $this->latestProgramIds(collect([$student->id]))
                ->intersect($this->teacherProgramIds($teacher))
                ->isNotEmpty();
        }

        if ($pair === ['teaching_staff', 'teaching_staff']) {
            return $this->teacherProgramIds($a)
                ->intersect($this->teacherProgramIds($b))
                ->isNotEmpty();
        }

        if ($pair === ['parent', 'teaching_staff']) {
            [$parent, $teacher] = $a->role === 'parent' ? [$a, $b] : [$b, $a];

            return $this->childProgramIds($parent)
                ->intersect($this->teacherProgramIds($teacher))
                ->isNotEmpty();
        }

        return false;
    }

    // A teacher's own program plus any programs they head.
    private function teacherProgramIds(User $teacher)
    {
        return TeachingStaff::programIdsFor($teacher->id);
    }

    // The latest-enrollment program of each student in the parent's family.
    private function childProgramIds(User $parent)
    {
        $familyIds = FamilyMember::where('member_id', $parent->id)->pluck('family_id');
        $childIds = FamilyMember::whereIn('family_id', $familyIds)
            ->where('member_id', '!=', $parent->id)
            ->pluck('member_id');
        $studentIds = User::whereIn('id', $childIds)->whereRole('student')->pluck('id');

        return $this->latestProgramIds($studentIds);
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

    // Teaching staff who teach in or head one of these programs.
    private function teachersInPrograms($programIds)
    {
        return TeachingStaff::whereIn('program_id', $programIds)->pluck('user_id')
            ->merge(\App\Models\ProgramHeadProgram::whereIn('program_id', $programIds)->pluck('user_id'))
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
            'groups' => $this->getGroups(),
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

        $suggestedIds = User::whereRole(self::ADMIN_ROLES)->pluck('id');

        if ($me->role === 'student') {
            $suggestedIds = $suggestedIds->merge($this->teachersInPrograms($this->latestProgramIds(collect([$me->id]))));
        } elseif ($me->role === 'parent') {
            $suggestedIds = $suggestedIds->merge($this->teachersInPrograms($this->childProgramIds($me)));
        } elseif ($me->role === 'teaching_staff') {
            $programIds = $this->teacherProgramIds($me);
            $suggestedIds = $suggestedIds
                ->merge($this->teachersInPrograms($programIds))
                ->merge($this->studentsInPrograms($programIds));
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

    // ---- Program group chats (teaching staff only) ----------------------

    /** The program groups the current user belongs to, with unread counts. */
    private function getGroups()
    {
        $me = auth()->user();
        if ($me->role !== 'teaching_staff') {
            return [];
        }

        $programIds = $this->teacherProgramIds($me);
        $reads = DB::table('group_message_reads')->where('user_id', $me->id)->pluck('last_read_message_id', 'program_id');

        return Program::whereIn('id', $programIds)->orderBy('name')->get()->map(function (Program $program) use ($me, $reads) {
            $last = GroupMessage::with('sender.profile')->where('program_id', $program->id)->latest('id')->first();

            return [
                'id' => $program->id,
                'encrypted_id' => encrypt_id($program->id),
                'name' => "{$program->name} Faculty",
                'program' => $program->name,
                'logo' => $program->logo,
                'members_count' => $this->teachersInPrograms(collect([$program->id]))->count(),
                'last_message' => $last ? "{$last->sender_name}: {$last->body}" : null,
                'last_message_at' => $last?->created_at,
                'unread_count' => GroupMessage::where('program_id', $program->id)
                    ->where('id', '>', $reads[$program->id] ?? 0)
                    ->where('sender_id', '!=', $me->id)
                    ->count(),
            ];
        })->values();
    }

    private function groupProgramOrAbort($encryptedId): Program
    {
        $programId = decrypt_id($encryptedId) ?? abort(404);
        $me = auth()->user();

        if ($me->role !== 'teaching_staff' || ! $this->teacherProgramIds($me)->contains($programId)) {
            abort(403, 'You are not a member of this group.');
        }

        return Program::findOrFail($programId);
    }

    public function getGroupThread($programId)
    {
        $program = $this->groupProgramOrAbort($programId);
        $me = auth()->user();

        $messages = GroupMessage::with('sender.profile')
            ->where('program_id', $program->id)
            ->orderBy('id')
            ->get();

        DB::table('group_message_reads')->updateOrInsert(
            ['program_id' => $program->id, 'user_id' => $me->id],
            ['last_read_message_id' => $messages->last()?->id ?? 0]
        );

        $members = User::with('profile')
            ->whereIn('id', $this->teachersInPrograms(collect([$program->id])))
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => trim(($u->profile?->first_name ?? '').' '.($u->profile?->last_name ?? '')) ?: $u->username,
            ])
            ->values();

        return response()->json([
            'group' => ['id' => $program->id, 'name' => "{$program->name} Faculty"],
            'members' => $members,
            'messages' => $messages,
        ]);
    }

    public function sendGroupMessage(Request $request, $programId)
    {
        $request->validate(['body' => 'required|string|max:5000']);
        $program = $this->groupProgramOrAbort($programId);
        $me = auth()->user();

        $message = GroupMessage::create([
            'program_id' => $program->id,
            'sender_id' => $me->id,
            'body' => trim($request->body),
        ]);
        $message->created_at = now();
        $message->load('sender.profile');

        DB::table('group_message_reads')->updateOrInsert(
            ['program_id' => $program->id, 'user_id' => $me->id],
            ['last_read_message_id' => $message->id]
        );

        broadcast(new GroupMessageSent($message))->toOthers();

        return response()->json(['message' => $message]);
    }

    public function markGroupRead($programId)
    {
        $program = $this->groupProgramOrAbort($programId);

        DB::table('group_message_reads')->updateOrInsert(
            ['program_id' => $program->id, 'user_id' => auth()->id()],
            ['last_read_message_id' => GroupMessage::where('program_id', $program->id)->max('id') ?? 0]
        );

        return response()->json(['ok' => true]);
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
