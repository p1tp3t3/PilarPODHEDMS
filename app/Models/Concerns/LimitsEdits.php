<?php

namespace App\Models\Concerns;

/**
 * How many times the one who filed a record (complaint, absent form,
 * referral, gate pass) can edit it while it's still pending: each edit is
 * kept as a revision (revisions()), so the edits used are its revisions.
 * A resubmission after a rejection (complaint / absent form: a revision
 * with rejected_at) is its own one-time action, not counted here.
 */
trait LimitsEdits
{
    public const MAX_EDITS = 3;

    public function editsUsed(): int
    {
        $query = $this->revisions();
        if (in_array('rejected_at', $this->revisions()->getRelated()->getFillable(), true)) {
            $query->whereNull('rejected_at');
        }

        return $query->count();
    }

    public function editsLeft(): int
    {
        return max(0, self::MAX_EDITS - $this->editsUsed());
    }
}
