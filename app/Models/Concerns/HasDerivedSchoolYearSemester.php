<?php

namespace App\Models\Concerns;

use App\Models\SchoolYearSemester;

/**
 * Replaces the old school_year_semester_id-style foreign key columns
 * (school_year_semester_id, confirmed_/rejected_/revoked_school_year_semester_id)
 * with methods that derive the same information from the record's own
 * timestamps instead — now that SchoolYearSemester rows carry real
 * date_start/date_end ranges, there's no need to separately store which
 * semester a record happened in.
 */
trait HasDerivedSchoolYearSemester
{
    public function schoolYearSemester(): ?SchoolYearSemester
    {
        return SchoolYearSemester::forDate($this->created_at);
    }

    public function confirmedSchoolYearSemester(): ?SchoolYearSemester
    {
        return SchoolYearSemester::forDate($this->confirmed_at);
    }

    public function rejectedSchoolYearSemester(): ?SchoolYearSemester
    {
        return SchoolYearSemester::forDate($this->rejected_at);
    }

    public function revokedSchoolYearSemester(): ?SchoolYearSemester
    {
        return SchoolYearSemester::forDate($this->revoked_at);
    }
}
