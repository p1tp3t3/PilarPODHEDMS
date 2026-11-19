@extends('emails.layouts.formal', [
    'preheader' => 'An update on your parent/guardian registration request.',
])

@section('subject', 'Parent/Guardian Registration Request')

@section('body')
    <p style="margin:0 0 14px;">Dear {{ $parentName }},</p>
    <p style="margin:0 0 6px;">
        Thank you for registering as a parent/guardian at Pilar College of Zamboanga City. After careful review, we regret to inform you that your registration request was <strong>not approved</strong> for the following reason:
    </p>

    @include('emails.partials.notice', [
        'label' => 'Reason',
        'tone' => 'danger',
        'content' => strip_tags($reason, '<p><br><b><strong><i><em><u><ul><ol><li>'),
    ])

    <p style="margin:0 0 14px;">
        You may submit a new request once the concern above has been addressed, or contact the Office of Student Affairs and Discipline for assistance.
    </p>
@endsection
