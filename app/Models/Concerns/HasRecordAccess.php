<?php

namespace App\Models\Concerns;

use App\Http\Controllers\Modules\Violation\ViolationController;
use App\Models\User;

/**
 * Who may open a complaint, referral, absent form or gate pass (its details
 * and its evidence files):
 *  - the prefect;
 *  - anyone the record names (filer, prefect who filed it, subjects);
 *  - whoever may see one of the record's students (their parent, their
 *    program head; ViolationController::canViewStudent);
 *  - any extra people the record type allows (canViewExtra()).
 */
trait HasRecordAccess
{
    /** Accounts the record names directly. */
    abstract protected function involvedUserIds(): array;

    /** Students the record is about (their parents/program heads may view it). */
    abstract protected function involvedStudentIds(): array;

    /** Extra viewers for this record type (Guidance, guards...). */
    protected function canViewExtra(User $user): bool
    {
        return false;
    }

    public function canView(?User $user): bool
    {
        if (! $user) {
            return false;
        }
        if ($user->role === 'sub_admin') {
            return true;
        }

        $involved = array_map('intval', array_filter($this->involvedUserIds()));
        if (in_array((int) $user->id, $involved, true)) {
            return true;
        }

        if ($this->canViewExtra($user)) {
            return true;
        }

        // canViewStudent() checks the signed-in user.
        if (in_array($user->role, ['parent', 'program_head'], true) && (int) $user->id === (int) auth()->id()) {
            foreach (array_filter($this->involvedStudentIds()) as $studentId) {
                if (ViolationController::canViewStudent($studentId)) {
                    return true;
                }
            }
        }

        return false;
    }
}
