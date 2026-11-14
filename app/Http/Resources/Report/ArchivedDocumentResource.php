<?php

namespace App\Http\Resources\Report;

use App\Http\Resources\BaseResource;
use App\Http\Resources\AbsentForm\AbsenceResource;
use App\Http\Resources\Complaint\ComplaintResource;
use App\Http\Resources\Complaint\ComplaintSubjectResource;
use App\Http\Resources\GatePass\GatePassResource;
use App\Http\Resources\Referral\ReferralReferredStudentResource;
use App\Http\Resources\Referral\ReferralResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * One row of the Archives page (ArchiveController::getDocuments()): a
 * complaint, referral, absent form or gate pass, through its own resource,
 * plus the fields the archive adds — `type`, who filed it (`usr`), the
 * student it's about (`student`) and, for complaints/referrals, every
 * student named (`students`).
 */
class ArchivedDocumentResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $record = match ($this->type) {
            'complaint' => new ComplaintResource($this->resource),
            'referral' => new ReferralResource($this->resource),
            'absent form' => new AbsenceResource($this->resource),
            'gate pass' => new GatePassResource($this->resource),
        };

        return array_merge($record->toArray($request), [
            'type' => $this->type,
            'usr' => UserResource::make($this->usr),
            'student' => UserResource::make($this->student),
            'students' => match ($this->type) {
                'complaint' => ComplaintSubjectResource::collection($this->students ?? collect()),
                'referral' => ReferralReferredStudentResource::collection($this->students ?? collect()),
                default => $this->missingValue(),
            },
        ]);
    }

    private function missingValue(): \Illuminate\Http\Resources\MissingValue
    {
        return new \Illuminate\Http\Resources\MissingValue;
    }
}
