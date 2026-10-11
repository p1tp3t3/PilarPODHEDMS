<?php

namespace App\Console\Commands;

use App\Models\SchoolYear;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:create-next-school-year-command')]
#[Description('Adds the next school year (with default semester dates) once the current school year has ended.')]
class CreateNextSchoolYearCommand extends Command
{
    public function handle(): void
    {
        $created = SchoolYear::createUpcomingIfDue();

        $this->info($created
            ? 'Added school year(s): '.collect($created)->pluck('year')->join(', ')
            : 'No school year due yet — next is '.SchoolYear::upcoming()['year'].' on '.SchoolYear::upcoming()['adds_on'].'.');
    }
}
