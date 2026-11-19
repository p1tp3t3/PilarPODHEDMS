@extends('emails.layouts.formal', [
    'preheader' => 'Your absent form has been approved.',
    'signatory' => $prefect_name,
    'reference' => $reference ?? null,
])

@php
    $day = fn ($d) => $d ? \Illuminate\Support\Carbon::parse($d)->format('F j, Y') : null;
    $from = $day($date_from);
    $to = $day($date_to);
@endphp

@section('subject', 'Approval of Absent Form')

@section('body')
    <p style="margin:0 0 14px;">Dear {{ $student_name }},</p>
    <p style="margin:0 0 6px;">
        This is to inform you that your absent form has been reviewed and <strong>approved</strong> by the Office of Student Affairs and Discipline. The details of the approved absence are as follows:
    </p>

    @include('emails.partials.details', ['rows' => [
        'Reference No.' => $reference ?? null,
        'Date of Absence' => $from === $to ? $from : "{$from} to {$to}",
        'Reason' => $reason,
        'Approved By' => $prefect_name,
        'Date Approved' => $confirmed_at,
    ]])

    <p style="margin:0 0 14px;">
        A copy of the approved form is attached to this email. Kindly present it to your instructors as proof of your excused absence.
    </p>
@endsection
