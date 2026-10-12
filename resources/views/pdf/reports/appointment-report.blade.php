<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Appointment Report</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; margin: 25px; color: #222; }
    .report-header { width: 100%; border-bottom: 3px solid #003366; margin-bottom: 15px; padding-bottom: 5px; }
    .report-header td { vertical-align: middle; }
    .report-header img { width: 80px; }
    .school-name { font-size: 16px; font-weight: bold; color: #003366; margin-bottom: 2px; }
    .school-info { font-size: 11px; color: #555; }
    .title-box { text-align: center; margin: 15px 0 10px; }
    .title-box h2 { font-size: 16px; color: #003366; margin: 0; }
    .profile-section { border: 1px solid #003366; border-radius: 4px; background-color: #f3f7fb; padding: 8px 10px; margin-top: 10px; }
    .profile-table { width: 100%; border-collapse: collapse; }
    .profile-table td { padding: 5px 8px; vertical-align: top; font-size: 12px; }
    .profile-table .label { font-weight: bold; color: #003366; width: 25%; }
    table.records { width: 100%; border-collapse: collapse; margin-top: 18px; }
    table.records th { background-color: #003366; color: white; padding: 6px; text-align: left; font-size: 12px; }
    table.records td { border: 1px solid #ddd; padding: 6px; font-size: 11px; }
    table.records tr:nth-child(even) { background-color: #f8f9fb; }
      /* ---- Page fit (DomPDF) ----
       Margins live on @page so every page gets them, not just the first
       and last; content then fits inside the printable width and wraps
       instead of running off the edge. */
    @page { margin: 18mm 14mm 20mm 14mm; }
    body { margin: 0 !important; padding: 0 !important; height: auto !important; }
    html { height: auto !important; margin: 18mm 14mm 20mm 14mm !important; }
    .page { max-width: none !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
    table { width: 100% !important; max-width: 100%; }
    th, td { word-wrap: break-word; overflow-wrap: break-word; }
    th, td { font-size: 11px !important; padding: 5px 6px !important; line-height: 1.3 !important; }
    tr { page-break-inside: avoid; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <table class="report-header">
    <tr>
      <td style="width: 90px;"><img src="{{ public_path('default-pic/pilar.png') }}" alt="Logo"></td>
      <td>
        <div class="school-name">PILAR COLLEGE OF ZAMBOANGA CITY, INC.</div>
        <div class="school-info">R.T. Lim Boulevard, Zamboanga City</div>
        <div class="school-info">Higher Education Department</div>
      </td>
    </tr>
  </table>

  <div class="title-box">
    <h2>{{ $report_title ?? 'Appointment Report' }}</h2>
    <div style="font-size: 11px; color: #555;">
      @if(!empty($school_year))
        School Year <strong>{{ $school_year }}</strong>
      @else
        From <strong>{{ \Carbon\Carbon::parse($from)->format('F d, Y') }}</strong>
        to <strong>{{ \Carbon\Carbon::parse($to)->format('F d, Y') }}</strong>
      @endif
    </div>
  </div>

  @if($individual ?? false)
  <div class="profile-section">
    <table class="profile-table">
      <tr>
        <td class="label">Student Name:</td>
        <td>{{ $student_name }}</td>
        <td class="label">Student ID:</td>
        <td>{{ $student_id }}</td>
      </tr>
      <tr>
        <td class="label">Program:</td>
        <td colspan="3">{{ $program }}</td>
      </tr>
    </table>
  </div>
  @endif

  <table class="records">
    <thead>
      <tr>
        <th style="width:4%;">#</th>
        @unless($individual ?? false)
          <th style="width:12%;">Student ID</th>
          <th style="width:18%;">Name</th>
          <th style="width:14%;">Program</th>
        @endunless
        <th style="width:22%;">Description</th>
        <th style="width:16%;">Requested Date/Time</th>
        <th style="width:16%;">Confirmed At</th>
      </tr>
    </thead>
    <tbody>
      @forelse ($data as $d)
        <tr>
          <td>{{ $d['i'] }}</td>
          @unless($individual ?? false)
            <td>{{ $d['student_id'] }}</td>
            <td>{{ $d['name'] }}</td>
            <td>{{ $d['program'] }}</td>
          @endunless
          <td>{{ $d['description'] }}</td>
          <td>{{ $d['date_time_appoint'] }}</td>
          <td>{{ $d['confirmed_at'] }}</td>
        </tr>
      @empty
        <tr><td colspan="7" style="text-align:center; padding:10px;">No appointment records found.</td></tr>
      @endforelse
    </tbody>
  </table>
</body>
</html>
