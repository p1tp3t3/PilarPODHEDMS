<?php

namespace App\Http\Controllers\Modules\Chat;

use App\Events\MessageEdited;
use App\Events\MessageSent;
use App\Events\MessagesRead;
use App\Events\MessageUnsent;
use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\MessageEdit;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ChatController extends Controller
{
    /**
     * Everyone can message sub_admin/super_admin, and sub_admin/super_admin
     * can message anyone back (each other included) — a hub-and-spoke
     * model with the two admin roles as the hubs, not a full mesh between
     * regular users.
     */
    private function canChat(User $a, User $b): bool
    {
        $isAdmin = fn (User $u) => in_array($u->role, ['sub_admin', 'super_admin']);

        return $isAdmin($a) || $isAdmin($b);
    }

    public function index()
    {
        return Inertia::render('chat/index', [
            'user' => auth()->user(),
            'contacts' => $this->getContacts(),
        ]);
    }

    /**
     * A regular user's contacts are always the current sub_admin/super_admin
     * accounts (so they can always start a conversation). An admin's
     * contacts are the other admin(s) plus anyone who has ever messaged
     * them, ranked by most recent activity.
     */
    private function getContacts()
    {
        $me = auth()->user();
        $isAdmin = in_array($me->role, ['sub_admin', 'super_admin']);

        if ($isAdmin) {
            $contactIds = User::where('id', '!=', $me->id)
                ->where(function ($q) use ($me) {
                    $q->whereIn('role', ['sub_admin', 'super_admin'])
                        ->orWhereIn('id', Message::where('receiver_id', $me->id)->select('sender_id'))
                        ->orWhereIn('id', Message::where('sender_id', $me->id)->select('receiver_id'));
                })
                ->pluck('id');
        } else {
            $contactIds = User::where('id', '!=', $me->id)
                ->whereIn('role', ['sub_admin', 'super_admin'])
                ->pluck('id');
        }

        $contacts = User::with(['profile', 'program', 'enrollments', 'teachingStaff.program', 'nonTeachingStaff'])
            ->whereIn('id', $contactIds)->get();

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

        try {
            send_web_push([
                'title' => trim("{$me->profile?->first_name} {$me->profile?->last_name}") ?: 'New message',
                'body' => $message->body,
                'icon' => '',
                'url' => '/chat',
            ], $receiver->id);
        } catch (\Throwable $e) {
            // best-effort — chat still works without push
        }

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
