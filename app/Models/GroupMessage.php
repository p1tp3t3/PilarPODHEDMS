<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupMessage extends Model
{
    protected $table = 'group_messages';

    protected $fillable = ['program_id', 'sender_id', 'body'];

    public $timestamps = false;

    protected $hidden = ['sender'];

    protected $appends = ['sender_name', 'sender_picture', 'sender_sex'];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }

    public function getSenderNameAttribute(): ?string
    {
        $p = $this->sender?->profile;

        return trim(($p?->first_name ?? '').' '.($p?->last_name ?? '')) ?: $this->sender?->username;
    }

    public function getSenderPictureAttribute(): ?string
    {
        return $this->sender?->profile?->profile_picture;
    }

    public function getSenderSexAttribute(): ?string
    {
        return $this->sender?->profile?->sex;
    }
}
