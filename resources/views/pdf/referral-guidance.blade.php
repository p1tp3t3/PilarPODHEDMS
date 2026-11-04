<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Referral Form</title>
    <style>
        @page { margin: 40px 55px; }
        body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 12px; color: #111; margin: 0; }

        .form-code { text-align: right; font-size: 10px; color: #333; }

        /* Letterhead: logo on the left, school name centered beside it */
        .letterhead { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .letterhead td { vertical-align: middle; }
        .letterhead .logo { width: 80px; }
        .letterhead .logo img { width: 72px; height: 72px; }
        .letterhead .school { text-align: center; line-height: 1.35; padding-right: 80px; }
        .letterhead .school .name { font-size: 14px; font-weight: bold; }
        .letterhead .school .sub { font-size: 12px; font-weight: bold; }

        .title { text-align: center; font-size: 15px; text-decoration: underline; margin: 22px 0 16px; }

        .date-row { text-align: right; margin-bottom: 14px; }
        .fill { display: inline-block; border-bottom: 1px solid #111; min-width: 190px; padding: 0 4px; }

        .label { font-weight: normal; margin-bottom: 4px; }

        /* Students referred (one or more) */
        ol.students { margin: 0 0 16px; padding-left: 26px; }
        ol.students li { padding: 3px 0; border-bottom: 1px solid #111; }
        ol.students .course { color: #444; font-size: 11px; }

        /* Reason: the written reason, then ruled lines like the paper form */
        .reason { border-bottom: 1px solid #111; padding: 2px 2px 4px; min-height: 18px; }
        .reason p { margin: 0 0 4px; }
        .line { border-bottom: 1px solid #111; height: 20px; }

        .referrer { margin-top: 26px; }
        .signature { text-align: center; width: 260px; padding: 0; }
        .signature .name { border-bottom: 1px solid #111; padding: 0 6px 2px; min-height: 16px; font-weight: bold; }
        .signature .caption { font-size: 11px; margin-top: 2px; }

        .counselor { margin-top: 26px; }
    </style>
</head>
<body>
    <div class="form-code">POD.COL-FO 0015</div>

    <table class="letterhead">
        <tr>
            <td class="logo"><img src="{{ public_path('default-pic/pilar-pdf.png') }}" alt="Pilar College"></td>
            <td class="school">
                <div class="name">Pilar College of Zamboanga City, Inc.</div>
                <div class="sub">R.T. Lim Boulevard, Zamboanga City, 7000</div>
                <div class="sub">Prefect of Discipline Office</div>
            </td>
        </tr>
    </table>

    <div class="title">Referral Form</div>

    <div class="date-row">Date/Time: <span class="fill">{{ $date_time }}</span></div>

    {{-- A referral can name one or more students. --}}
    <div class="label">{{ count($students) > 1 ? 'Students Referred:' : 'Student Referred:' }}</div>
    <ol class="students">
        @foreach (collect($students)->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE) as $s)
            <li>{{ $s['name'] }} <span class="course">({{ $s['course'] }})</span></li>
        @endforeach
    </ol>

    <div class="label">Reason for Referral:</div>
    <div class="reason">{!! $referral_reason !!}</div>
    @for ($i = 0; $i < 3; $i++)
        <div class="line"></div>
    @endfor

    <table class="referrer" style="border-collapse: collapse;">
        <tr>
            <td style="vertical-align: bottom; padding: 0 6px 2px 0;">Referrer:</td>
            <td class="signature"><div class="name">{{ $referrer_name }}</div></td>
        </tr>
        <tr>
            <td></td>
            <td class="signature"><div class="caption">Signature over Printed Name</div></td>
        </tr>
    </table>

    {{-- Filled in by hand by the counselor. --}}
    <div class="counselor">
        <div class="label">Counselor's Note:</div>
        @for ($i = 0; $i < 8; $i++)
            <div class="line"></div>
        @endfor
    </div>
</body>
</html>
