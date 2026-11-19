@php($officeName = ($office ?? 'Guidance') === 'IT Staff' ? 'IT Staff' : 'Guidance Office')

@extends('emails.layouts.formal', [
    'preheader' => "A referral has been forwarded to the {$officeName}.",
    'signatory' => $prefect_name,
    'reference' => $reference ?? null,
])

@section('subject', 'Referral of Student(s) for Appropriate Action')

@section('body')
    <p style="margin:0 0 14px;">Dear {{ $officeName }},</p>
    <p style="margin:0 0 6px;">
        Respectfully forwarded to your office is a referral from the Office of Student Affairs and Discipline, for your evaluation and appropriate action. The details are as follows:
    </p>

    @include('emails.partials.details', ['rows' => [
        'Reference No.' => $reference ?? null,
        'Student(s)' => $student_names,
        'Referred By' => $prefect_name . ', Prefect of Discipline',
        'Date Issued' => $date_issued,
    ]])

    <p style="margin:0 0 14px;">
        The referral form is attached to this email. You may also view the referral and record your office's note in the system. Thank you for your assistance.
    </p>
@endsection
