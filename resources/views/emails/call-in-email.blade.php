@extends('emails.layouts.formal', [
    'preheader' => 'You are requested to report to the Office of Student Affairs and Discipline.',
    'signatory' => $prefect_name,
    'reference' => $reference ?? null,
])

@section('subject', 'Office Call from the Prefect of Discipline')

@section('body')
    <p style="margin:0 0 14px;">Dear {{ $student_name }},</p>
    <p style="margin:0 0 6px;">
        You are hereby requested to report to the Office of Student Affairs and Discipline for the following matter:
    </p>

    @include('emails.partials.notice', [
        'label' => 'Details',
        // The message is the editor's HTML: as plain text, line by line.
        'content' => nl2br(e(trim(html_entity_decode(strip_tags(preg_replace('#</p>\s*<p[^>]*>|<br\s*/?>#i', PHP_EOL, (string) $call_in_reason)))))),
    ])

    <p style="margin:0 0 14px;">
        Please present yourself at the office at the soonest possible time, and bring your school identification card. Failure to comply may be noted in your record.
    </p>
@endsection
