@extends('emails.layouts.formal', [
    'preheader' => "Your verification code is {$otp}.",
])

@section('subject', 'Your Verification Code')

@section('body')
    <p style="margin:0 0 14px;">Good day,</p>
    <p style="margin:0 0 6px;">
        A verification code was requested for your account in the Prefect of Discipline Management System. Please enter the code below to continue:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 20px;">
        <tr>
            <td align="center" style="background-color:#f5f7fa; border:1px solid #d9dde3; padding:18px 12px;">
                <div style="font-family:'Courier New', Courier, monospace; font-size:32px; font-weight:bold; letter-spacing:10px; color:#000;">{{ $otp }}</div>
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#000; margin-top:6px;">This code expires shortly and can be used only once.</div>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 14px;">
        For your security, do not share this code with anyone, including school personnel. If you did not request it, you may safely ignore this email; your account remains unchanged.
    </p>
@endsection
