{{--
    The formal letter every system email uses: the school letterhead (as on
    the PDF documents), a subject line, the letter body, an optional
    signature and a small footer. Table layout and inline styles only, so it
    reads the same in Gmail, Outlook and phone mail apps.

    Sections:   subject (required), body (required)
    Variables:  $preheader  the preview line mail apps show next to the subject
                $signatory  name under "Respectfully," (no signature when empty)
                $signatoryTitle  line under the name (default: Prefect of Discipline)
                $reference  the record's reference number, shown under the subject
--}}
@php
    // The school logo from a public link (config/mail.php's logo_url), never
    // embedded: mail apps (Gmail) list an embedded image as an attachment.
    $logo = config('mail.logo_url');
    $serif = "Georgia, 'Times New Roman', Times, serif";
    $sans = "Arial, Helvetica, sans-serif";
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>@yield('subject')</title>
</head>
<body style="margin:0; padding:0; background-color:#eef0f3;">
    @if (!empty($preheader))
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">{{ $preheader }}</div>
    @endif
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef0f3;">
        <tr>
            <td align="center" style="padding:28px 12px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #d9dde3;">

                    {{-- Letterhead --}}
                    <tr>
                        <td style="padding:26px 36px 0;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    @if ($logo)
                                        <td width="64" valign="middle" style="padding-right:14px;">
                                            <img src="{{ $logo }}" width="56" height="56" alt="Pilar College" style="display:block; width:56px; height:56px; border:0;">
                                        </td>
                                    @endif
                                    <td valign="middle" style="font-family:{{ $serif }};">
                                        <div style="font-size:17px; font-weight:bold; color:#000; letter-spacing:0.2px;">Pilar College of Zamboanga City, Inc.</div>
                                        <div style="font-size:11.5px; color:#000; margin-top:2px; font-family:{{ $sans }};">R.T. Lim Boulevard, Zamboanga City, 7000 &middot; College Department</div>
                                        <div style="font-size:11px; font-weight:bold; color:#000; text-transform:uppercase; letter-spacing:1.2px; margin-top:4px; font-family:{{ $sans }};">Office of Student Affairs and Discipline</div>
                                    </td>
                                </tr>
                            </table>
                            <div style="height:3px; background-color:#1f3a5f; margin-top:14px; line-height:3px; font-size:0;">&nbsp;</div>
                            <div style="height:1px; background-color:#b8892b; margin-top:2px; line-height:1px; font-size:0;">&nbsp;</div>
                        </td>
                    </tr>

                    {{-- Subject line --}}
                    <tr>
                        <td style="padding:22px 36px 0; font-family:{{ $sans }};">
                            <div style="font-size:11px; color:#000; text-transform:uppercase; letter-spacing:1px;">Subject</div>
                            <div style="font-size:16px; font-weight:bold; color:#000; margin-top:3px; font-family:{{ $serif }};">@yield('subject')</div>
                            <div style="font-size:12px; color:#000; margin-top:4px;">
                                {{ now()->format('F j, Y') }}
                                @if (!empty($reference))
                                    &nbsp;&middot;&nbsp; Reference No. <strong style="color:#000;">{{ $reference }}</strong>
                                @endif
                            </div>
                        </td>
                    </tr>

                    {{-- Letter body --}}
                    <tr>
                        <td style="padding:18px 36px 8px; font-family:{{ $serif }}; font-size:15px; line-height:1.7; color:#000; text-align:justify;">
                            @yield('body')
                        </td>
                    </tr>

                    {{-- Signature --}}
                    @if (!empty($signatory))
                        <tr>
                            <td style="padding:10px 36px 6px; font-family:{{ $serif }}; font-size:15px; line-height:1.6; color:#000;">
                                Respectfully,
                                <div style="margin-top:22px; font-weight:bold; color:#000;">{{ $signatory }}</div>
                                <div style="font-size:13px; color:#000; font-family:{{ $sans }};">{{ $signatoryTitle ?? 'Prefect of Discipline' }}</div>
                            </td>
                        </tr>
                    @endif

                    {{-- Footer --}}
                    <tr>
                        <td style="padding:24px 36px 26px;">
                            <div style="height:1px; background-color:#e5e7eb; line-height:1px; font-size:0;">&nbsp;</div>
                            <div style="font-family:{{ $sans }}; font-size:11.5px; line-height:1.6; color:#000; margin-top:12px;">
                                This is an official message from the Office of Student Affairs and Discipline, sent through the Prefect of Discipline Management System. Please do not reply to this email; for concerns, visit or contact the office directly.
                            </div>
                        </td>
                    </tr>
                </table>
                <div style="font-family:{{ $sans }}; font-size:11px; color:#000; margin-top:12px;">&copy; {{ now()->year }} Pilar College of Zamboanga City, Inc.</div>
            </td>
        </tr>
    </table>
</body>
</html>
