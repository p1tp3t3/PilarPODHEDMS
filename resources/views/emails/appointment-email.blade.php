@extends('emails.layouts.formal', [
    'preheader' => "An appointment has been scheduled regarding {$student_name}.",
    'signatory' => $prefect_name,
])

@section('subject', 'Notice of Scheduled Appointment')

@section('body')
    <p style="margin:0 0 14px;">Dear {{ $parent_name }},</p>
    <p style="margin:0 0 6px;">
        We respectfully inform you that an appointment has been scheduled with the Office of Student Affairs and Discipline concerning your child, <strong>{{ $student_name }}</strong>, regarding their record of incidents and violations.
    </p>

    @include('emails.partials.details', ['rows' => [
        'Date' => $appointment_date,
        'Time' => $appointment_time,
        'Purpose' => "Discussion of the student's record of incidents and violations",
        'With' => $prefect_name . ', Prefect of Discipline',
    ]])

    <p style="margin:0 0 14px;">
        Your presence is highly encouraged. Should you need to reschedule or have any questions, please contact the office{{ $contact_number ? ' at ' . $contact_number : '' }}.
    </p>
    <p style="margin:0 0 14px;">Thank you for your time and cooperation.</p>
@endsection
