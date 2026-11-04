<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Approved Absence Form</title>
    @php
        $fmt = fn ($d) => $d ? \Carbon\Carbon::parse($d)->format('F j, Y') : '—';
        $days = ($date_from && $date_to)
            ? \Carbon\Carbon::parse($date_from)->diffInDays(\Carbon\Carbon::parse($date_to)) + 1
            : null;
        $period = $date_from === $date_to || ! $date_to
            ? $fmt($date_from)
            : $fmt($date_from).' to '.$fmt($date_to);
    @endphp
    <style>
        @page { margin: 34px 48px 46px; }
        body { font-family: "DejaVu Serif", "Times New Roman", serif; font-size: 12px; color: #111; margin: 0; }

        .title { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin: 20px 0 2px; }
        .subtitle { text-align: center; font-size: 10.5px; color: #555; margin-bottom: 18px; }

        .date-row { text-align: right; margin-bottom: 16px; }

        .section { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10.5px; font-weight: bold; color: #1f3a5f; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #c9d2de; padding-bottom: 3px; margin: 18px 0 8px; }

        table.fields { width: 100%; border-collapse: collapse; }
        table.fields td { padding: 5px 0; vertical-align: bottom; }
        table.fields td.label { white-space: nowrap; padding-right: 10px; width: 1%; }
        table.fields td.value { border-bottom: 1px solid #111; padding-left: 4px; }

        .certify { line-height: 1.8; text-align: justify; margin: 4px 0 0; }
        .note { border: 1px solid #555; padding: 8px 10px; min-height: 60px; line-height: 1.5; }

        table.sign { width: 100%; border-collapse: collapse; margin-top: 46px; }
        table.sign td { vertical-align: bottom; padding: 0; }
        .sign-line { border-bottom: 1px solid #111; text-align: center; font-weight: bold; padding-bottom: 2px; min-height: 16px; }
        .caption { text-align: center; font-size: 10px; color: #333; margin-top: 2px; }

        /* Large faint "approved" watermark across the middle of the page */
        .watermark { position: fixed; top: 245px; left: 0; right: 0; text-align: center; }
        .watermark img { width: 440px; height: 440px; opacity: 0.16; transform: rotate(-20deg); }

        .footer { position: fixed; bottom: -30px; left: 0; right: 0; text-align: center; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 8.5px; color: #777; border-top: 1px solid #ddd; padding-top: 4px; }
    </style>
</head>
<body>
    <div class="watermark"><img src="{{ public_path('default-pic/approved-pic-pdf.png') }}" alt="Approved"></div>
    <div class="footer">Office of Student Affairs and Discipline &middot; Pilar College of Zamboanga City, Inc. &middot; This form is valid only with the signature of the Prefect of Discipline.</div>

    @include('pdf.partials.letterhead', ['meta' => ['Form No.' => $form_number ?? null, 'Status' => $status]])

    <div class="title">Approved Absence Form</div>
    <div class="subtitle">Office of Student Affairs and Discipline</div>

    <div class="date-row">Date Approved: <strong>{{ $fmt($date_approve) }}</strong></div>

    <div class="section">Student Information</div>
    <table class="fields">
        <tr><td class="label">Name of Student:</td><td class="value">{{ trim(preg_replace('/\s+/', ' ', $sender_name)) }}</td></tr>
        <tr><td class="label">Student ID No.:</td><td class="value">{{ $student_id ?: '—' }}</td></tr>
        <tr><td class="label">Program:</td><td class="value">{{ $program ?: '—' }}</td></tr>
    </table>

    <div class="section">Details of Absence</div>
    <table class="fields">
        <tr><td class="label">Date(s) of Absence:</td><td class="value">{{ $period }}</td></tr>
        <tr><td class="label">Number of Day(s):</td><td class="value">{{ $days ? $days.' '.($days > 1 ? 'days' : 'day') : '—' }}</td></tr>
        <tr><td class="label">Reason for Absence:</td><td class="value">{{ $reason }}</td></tr>
    </table>

    <div class="section">Certification</div>
    <p class="certify">
        This is to certify that <strong>{{ trim(preg_replace('/\s+/', ' ', $sender_name)) }}</strong>{{ $program ? ', a student of '.$program.',' : '' }}
        has submitted the required documents for the absence on <strong>{{ $period }}</strong>, and that the said absence
        has been reviewed and <strong>approved</strong> by this office. The student is requested to present this form
        to the concerned instructors for proper consideration.
    </p>

    <div class="section">Remarks of the Prefect</div>
    <div class="note">{{ $note ?: 'None.' }}</div>

    <table class="sign">
        <tr>
            <td style="width: 45%;">
                <div class="sign-line">{{ trim(preg_replace('/\s+/', ' ', $prefect_name)) }}</div>
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%;"><div class="sign-line">&nbsp;</div></td>
        </tr>
        <tr>
            <td><div class="caption">Approved by: Prefect of Discipline</div></td>
            <td></td>
            <td><div class="caption">Received by: Instructor (Signature over Printed Name)</div></td>
        </tr>
    </table>
</body>
</html>
