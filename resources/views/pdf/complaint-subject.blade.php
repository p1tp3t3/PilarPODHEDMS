<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Complaint Form</title>
    @php
        // Rich-text fields come from the editor; keep only formatting tags.
        $rich = fn ($html) => strip_tags((string) $html, '<p><br><strong><b><em><i><u><ul><ol><li>');
        $many = count($subjects) > 1;
    @endphp
    <style>
        @page { margin: 34px 48px 46px; }
        body { font-family: "DejaVu Serif", "Times New Roman", serif; font-size: 12px; color: #111; margin: 0; }
        .page-break { page-break-before: always; }

        .title { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin: 18px 0 2px; }
        .subtitle { text-align: center; font-size: 10.5px; color: #555; margin-bottom: 16px; }

        /* Underlined fill-in fields like the paper form */
        table.fields { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.fields td { padding: 4px 0; vertical-align: bottom; }
        table.fields td.label { white-space: nowrap; padding-right: 8px; width: 1%; }
        table.fields td.value { border-bottom: 1px solid #111; padding-left: 4px; }

        .section { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10.5px; font-weight: bold; color: #1f3a5f; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #c9d2de; padding-bottom: 3px; margin: 16px 0 8px; }

        table.grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.grid th, table.grid td { border: 1px solid #555; padding: 5px 7px; text-align: left; vertical-align: top; }
        table.grid th { background: #eef2f7; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        table.grid td.no { width: 22px; text-align: center; }

        .list-label { margin: 2px 0 4px; }
        ol.names { margin: 0 0 10px; padding-left: 26px; }
        ol.names li { padding: 3px 0; border-bottom: 1px solid #111; }
        ol.names .designation, ol.findings .designation { color: #444; font-size: 11px; }
        ol.findings { margin: 0 0 10px; padding-left: 26px; }
        ol.findings li { padding: 5px 0 7px; border-bottom: 1px solid #c9d2de; }
        ol.findings .finding { margin: 3px 0 0 12px; padding-left: 8px; border-left: 2px solid #b8892b; line-height: 1.5; }

        .details { border: 1px solid #555; padding: 8px 10px; min-height: 150px; line-height: 1.5; }
        .details p { margin: 0 0 6px; }

        .attest { margin-top: 22px; font-style: italic; }
        table.sign { width: 100%; border-collapse: collapse; margin-top: 26px; }
        table.sign td { vertical-align: bottom; padding: 0; }
        .sign-line { border-bottom: 1px solid #111; text-align: center; font-weight: bold; padding-bottom: 2px; min-height: 16px; }
        .caption { text-align: center; font-size: 10px; color: #333; margin-top: 2px; }

        .footer { position: fixed; bottom: -30px; left: 0; right: 0; text-align: center; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 8.5px; color: #777; border-top: 1px solid #ddd; padding-top: 4px; }
    </style>
</head>
<body>
    <div class="footer">Office of Student Affairs and Discipline &middot; Pilar College of Zamboanga City, Inc. &middot; Confidential</div>

    {{-- ===================== PAGE 1: COMPLAINT FORM ===================== --}}
    @include('pdf.partials.letterhead', ['meta' => ['Reference No.' => $complaint_number, 'Case No.' => $case_number]])

    <div class="title">Complaint Form</div>
    <div class="subtitle">Office of Student Affairs and Discipline</div>

    <table class="fields">
        <tr><td class="label">Date:</td><td class="value" style="width: 40%;">{{ $date_filed }}</td><td></td></tr>
    </table>

    <div class="section">Complainant</div>
    <table class="fields">
        <tr><td class="label">Complainant Name:</td><td class="value">{{ $complainant_name }}</td></tr>
    </table>

    <div class="section">Complaint</div>
    <table class="fields">
        <tr><td class="label">Nature of Complaint:</td><td class="value">{{ $nature }}</td></tr>
        <tr><td class="label">Against:</td><td class="value">{{ count($subjects) }} {{ $many ? 'persons' : 'person' }}</td></tr>
    </table>

    {{-- A complaint can name one or more people. --}}
    <div class="list-label">Name of person{{ $many ? 's' : '' }} subject of complaint (Position/Designation):</div>
    @if (count($subjects))
        <ol class="names">
            @foreach (collect($subjects)->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE) as $s)
                <li>{{ $s['name'] }} <span class="designation">({{ $s['designation'] }})</span></li>
            @endforeach
        </ol>
    @else
        <div class="names">N/A</div>
    @endif

    <div class="section">Details of Complaint</div>
    <div class="details">{!! $rich($complaint_description) !!}</div>

    <div class="attest">I hereby attest that the information given above is true and correct.</div>
    <table class="sign">
        <tr>
            <td style="width: 52%;"><div class="sign-line">{{ $complainant_name }}</div></td>
            <td style="width: 10%;"></td>
            <td style="width: 38%;"><div class="sign-line">{{ $date_filed }}</div></td>
        </tr>
        <tr>
            <td><div class="caption">Signature of Complainant</div></td>
            <td></td>
            <td><div class="caption">Date</div></td>
        </tr>
    </table>

    <table class="sign" style="width: 60%; margin-top: 30px;">
        <tr><td style="width: 95px; font-weight: normal;">Received by:</td><td><div class="sign-line">{{ $received_by }}</div></td></tr>
        <tr><td></td><td><div class="caption">Prefect of Discipline (Name and Designation)</div></td></tr>
    </table>

    {{-- ===================== PAGE 2: INCIDENT SUMMARY ===================== --}}
    {{-- Only once the complaint is resolved (not pending, ongoing, rejected or revoked). --}}
    @if ($show_summary ?? false)
    <div class="page-break"></div>
    @include('pdf.partials.letterhead', ['meta' => ['Reference No.' => $complaint_number, 'Case No.' => $case_number]])

    <div class="title">Incident Summary</div>
    <div class="subtitle">Findings of the Office of Student Affairs and Discipline</div>

    <table class="grid">
        <tr>
            <th style="width: 22%;">Reference No.</th><td style="width: 28%;">{{ $complaint_number ?? 'N/A' }}</td>
            <th style="width: 22%;">Case No.</th><td>{{ $case_number ?? 'N/A' }}</td>
        </tr>
        <tr>
            <th>Date Filed</th><td>{{ $date_filed }}</td>
            <th>Date Resolved</th><td>{{ $date_resolved }}</td>
        </tr>
        <tr>
            <th>Complainant</th><td>{{ $complainant_name }}</td>
            <th>Nature of Complaint</th><td>{{ $nature }}</td>
        </tr>
    </table>

    <div class="section">Summary of the Incident</div>
    <div class="details" style="min-height: 110px;">{!! nl2br($rich($incident_summary)) !!}</div>

    <div class="section">Findings and Sanctions</div>
    <ol class="findings">
        @foreach (collect($subjects)->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE) as $s)
            <li>
                <strong>{{ $s['name'] }}</strong> <span class="designation">({{ $s['designation'] }})</span>
                @forelse ($s['findings'] as $f)
                    <div class="finding">
                        Violation: <strong>{{ $f['violation'] }}</strong> &middot; {{ $f['occurrence'] }}<br>
                        Sanction: {{ $f['penalty'] }}
                    </div>
                @empty
                    <div class="finding"><em>No violation committed</em></div>
                @endforelse
            </li>
        @endforeach
    </ol>

    <table class="sign" style="margin-top: 40px;">
        <tr>
            <td style="width: 45%;"><div class="sign-line">{{ $received_by }}</div></td>
            <td style="width: 10%;"></td>
            <td style="width: 45%;"><div class="sign-line">&nbsp;</div></td>
        </tr>
        <tr>
            <td><div class="caption">Prepared by: Prefect of Discipline</div></td>
            <td></td>
            <td><div class="caption">Noted by</div></td>
        </tr>
    </table>
    @endif
</body>
</html>
