@extends('emails.layouts.formal', [
    'preheader' => 'Your parent/guardian account is ready.',
])

@section('subject', 'Parent/Guardian Account Credentials')

@section('body')
    <p style="margin:0 0 14px;">Good day,</p>
    <p style="margin:0 0 6px;">
        Your parent/guardian account in the Prefect of Discipline Management System has been created. Through this account you may view your child's discipline records, appointments and notices from the Office of Student Affairs and Discipline. Your login details are as follows:
    </p>

    @foreach ($parents as $parent)
        @include('emails.partials.details', ['rows' => [
            'Name' => $parent['name'] ?? null,
            'Relationship' => $parent['role'] ?? null,
            'Username' => $parent['username'] ?? null,
            'Temporary Password' => $parent['password'] ?? null,
        ]])
    @endforeach

    <p style="margin:0 0 14px;">
        For your security, you will be asked to change this temporary password the first time you log in. Please keep your login details private.
    </p>
@endsection
