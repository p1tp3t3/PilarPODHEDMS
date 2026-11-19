@php
    $approved = $status !== 'disapprove';
    $when = fn ($d) => $d ? \Illuminate\Support\Carbon::parse($d)->format('F j, Y \a\t g:i A') : null;
@endphp

@extends('emails.layouts.formal', [
    'preheader' => $approved ? 'Your gate pass request has been approved.' : 'Your gate pass request was not approved.',
    'signatory' => $prefect_name,
    'reference' => $reference ?? null,
])

@section('subject', $approved ? 'Approval of Gate Pass Request' : 'Gate Pass Request Not Approved')

@section('body')
    <p style="margin:0 0 14px;">Dear {{ $requester }},</p>

    @if ($approved)
        <p style="margin:0 0 6px;">
            This is to inform you that your gate pass request has been reviewed and <strong>approved</strong> by the Office of Student Affairs and Discipline.
        </p>

        @include('emails.partials.details', ['rows' => [
            'Reference No.' => $reference ?? null,
            'Date Requested' => $when($date_requested),
            'Valid Until' => $when($date_time_expiration),
        ]])

        <p style="margin:0 0 14px;">
            Kindly present your gate pass to the security personnel at the gate. It may no longer be used once it has expired. You may view its details in the system under Gate Pass.
        </p>
    @else
        <p style="margin:0 0 14px;">
            We regret to inform you that your gate pass request{{ !empty($reference) ? ' (Reference No. ' . $reference . ')' : '' }} submitted on <strong>{{ $when($date_requested) }}</strong> was <strong>not approved</strong>. You may view the reason in the system under Gate Pass, or visit the office for clarification.
        </p>
    @endif
@endsection
