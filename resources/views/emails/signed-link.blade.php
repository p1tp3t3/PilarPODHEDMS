@extends('emails.layouts.formal', [
    'preheader' => $description,
])

@section('subject', $heading)

@section('body')
    <p style="margin:0 0 14px;">Good day,</p>
    <p style="margin:0 0 6px;">{{ $description }}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 18px;">
        <tr>
            <td style="background-color:#1f3a5f;">
                <a href="{{ $url }}" style="display:inline-block; padding:12px 26px; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; letter-spacing:0.3px;">{{ $buttonLabel }}</a>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 6px; font-family:Arial, Helvetica, sans-serif; font-size:12.5px; color:#000;">
        If the button does not work, copy this link into your browser:
    </p>
    <p style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:12.5px; word-break:break-all;">
        <a href="{{ $url }}" style="color:#000;">{{ $url }}</a>
    </p>
    <p style="margin:0 0 14px;">
        This link expires in 60 minutes. If you did not request it, you may safely ignore this email.
    </p>
@endsection
