@extends('emails.layouts.formal', [
    'preheader' => 'You are requested to report to the Office of Student Affairs and Discipline.',
    'signatory' => $prefect_name,
])

@section('subject', 'Office Call from the Prefect of Discipline')

@section('body')
    <p style="margin:0 0 14px;">Dear {{ $student_name }},</p>
    <p style="margin:0 0 6px;">
        You are hereby requested to report to the Office of Student Affairs and Discipline for the following matter:
    </p>

    @include('emails.partials.notice', [
        'label' => 'Details',
        'content' => nl2br(e($call_in_reason)),
    ])

    <p style="margin:0 0 14px;">
        Please present yourself at the office at the soonest possible time, and bring your school identification card. Failure to comply may be noted in your record.
    </p>
@endsection
