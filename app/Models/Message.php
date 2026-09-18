<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Message extends Model
{
    use HasFactory;

    protected $table = 'message';

    protected $fillable = ['sender_id', 'receiver_id', 'reply_to_id', 'body', 'read_at', 'unsent_at', 'edited_at'];

    public $timestamps = false;

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id', 'id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id', 'id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id', 'id');
    }

    public function edits(): HasMany
    {
        return $this->hasMany(MessageEdit::class, 'message_id', 'id')->orderBy('created_at');
    }
}
