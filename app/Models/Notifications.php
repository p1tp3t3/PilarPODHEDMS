<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notifications extends Model
{
    protected $table = 'notification';

    protected $fillable = ['sender_id', 'receiver_id', 'notif_type', 'content'];

    public $timestamps = false;

    // Links to a notification (and to the complaint / referral / absent
    // form / gate pass it's about) carry these encrypted ids, never the raw
    // ones; DecryptEncryptedIds / decrypt_id() turn them back.
    protected $appends = ['encrypted_id', 'record_key'];

    public function getEncryptedIdAttribute(): string
    {
        return encrypt_id($this->id);
    }

    // The related record's id, stored inside `content` (top-level `id`, or
    // `gatepass.id` for gate pass notifications), encrypted.
    public function getRecordKeyAttribute(): ?string
    {
        $content = is_string($this->content) ? json_decode($this->content, true) : $this->content;
        $id = $content['id'] ?? ($content['gatepass']['id'] ?? null);

        return is_numeric($id) ? encrypt_id((int) $id) : null;
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id', 'id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id', 'id');
    }
}
