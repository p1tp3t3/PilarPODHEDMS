<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActionLog extends Model
{
    const UPDATED_AT = null;

    public $timestamps = false;

    protected $fillable = ['user_id', 'action_type', 'details'];

    protected $table = 'action_log';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * Records an action, optionally with a field-level before/after diff so
     * a viewer sees exactly what changed instead of just a sentence.
     * `details` stays a plain string when there's nothing to diff (a login,
     * a brand-new record with no "previous" version) — only actions that
     * actually change existing field values pass $changes, encoded as
     * JSON so detailsParsed()/the report views can render it structured.
     *
     * $changes shape: ['field_name' => ['from' => $old, 'to' => $new], ...]
     */
    public static function log($userId, string $actionType, string $summary, array $changes = []): self
    {
        return self::create([
            'user_id' => $userId,
            'action_type' => $actionType,
            'details' => empty($changes)
                ? $summary
                : json_encode(['summary' => $summary, 'changes' => $changes], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);
    }

    /**
     * Recovers the structured shape `log()` wrote — old rows (and any
     * future call site that still just writes a plain sentence to
     * `details` directly) simply come back with an empty `changes` array.
     */
    public function detailsParsed(): array
    {
        $decoded = json_decode($this->details ?? '', true);

        if (is_array($decoded) && array_key_exists('summary', $decoded)) {
            return ['summary' => $decoded['summary'], 'changes' => $decoded['changes'] ?? []];
        }

        return ['summary' => $this->details, 'changes' => []];
    }
}
