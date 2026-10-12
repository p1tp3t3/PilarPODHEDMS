<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Student Analytics Report</title>
<style>
  body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 12px;
    margin: 25px;
    color: #222;
  }

  .report-header {
    width: 100%;
    border-bottom: 3px solid #003366;
    margin-bottom: 15px;
    padding-bottom: 5px;
  }

  .report-header td { vertical-align: middle; }
  .report-header img { width: 80px; }

  .school-name {
    font-size: 16px;
    font-weight: bold;
    color: #003366;
  }

  .school-info {
    font-size: 11px;
    color: #555;
  }

  .title-box {
    text-align: center;
    margin: 15px 0 10px;
  }

  .title-box h2 {
    font-size: 16px;
    color: #003366;
    margin: 0;
  }

  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
  }

  table.data th {
    background-color: #003366;
    color: white;
    padding: 6px;
    text-align: left;
    font-size: 12px;
  }

  table.data td {
    border: 1px solid #ddd;
    padding: 6px;
    font-size: 11px;
  }

  table.data tr:nth-child(even) {
    background-color: #f8f9fb;
  }

  .chart {
    text-align: center;
    margin-top: 25px;
  }

  .chart img {
    max-width: 700px;
    width: 100%;
    border: 1px solid #ccc;
    border-radius: 6px;
    margin-top: 10px;
  }

  footer {
    margin-top: 25px;
    font-size: 11px;
    text-align: right;
    color: #555;
  }
  /* --- SUMMARY BOX --- */
  .summary-box {
    border: 1px solid #003366;
    background-color: #f3f7fb;
    border-radius: 4px;
    padding: 10px 12px;
    margin-top: 10px;
  }

  .summary-grid {
    width: 100%;
    border-collapse: collapse;
  }

  .summary-grid td {
    padding: 6px 10px;
    font-size: 12px;
  }
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

  {{-- HEADER --}}
  <table class="report-header">
    <tr>
      <td style="width: 90px;">
        <img src="{{ public_path('default-pic/pilar.png') }}" alt="Logo">
      </td>
      <td>
        <div class="school-name">PILAR COLLEGE OF ZAMBOANGA CITY, INC.</div>
        <div class="school-info">R.T. Lim Boulevard, Zamboanga City</div>
        <div class="school-info">Higher Education Department</div>
      </td>
    </tr>
  </table>

  {{-- TITLE --}}
  <div class="title-box">
    <h2>Student Incident & Violation Analytics Report</h2>
    <div style="font-size: 11px; color: #555;">
      From <strong>{{ \Carbon\Carbon::parse($from)->format('F d, Y') }}</strong> 
      to <strong>{{ \Carbon\Carbon::parse($to)->format('F d, Y') }}</strong>
    </div>
  </div>

  <div class="summary-box">
    <table class="summary-grid">
      <tr>
        <td class="label">Total Incidents:</td>
        <td>{{ $incidentCount }}</td>
        <td class="label">Resolved Cases:</td>
        <td>{{ $resolved }}</td>
      </tr>
      <tr>
        <td class="label">Total Violations:</td>
        <td>{{ $totalViolations }}</td>
      </tr>
    </table>
  </div>

  {{-- VIOLATIONS PER PROGRAM --}}
  <h4 style="margin-top:15px; color:#003366;">Violations per Program</h4>
  <table class="data">
    <thead>
      <tr>
        <th>Program</th>
        <th>Students with Violations</th>
        <th>Total Violations</th>
      </tr>
    </thead>
    <tbody>
      @forelse($violationPerProgram as $row)
        <tr>
          <td>{{ $row->program }}</td>
          <td>{{ $row->students_with_violations }}</td>
          <td>{{ $row->total_violations }}</td>
        </tr>
      @empty
        <tr>
          <td colspan="3" style="text-align:center;">No data available</td>
        </tr>
      @endforelse
    </tbody>
  </table>

  {{-- TOP STUDENTS --}}
  <h4 style="margin-top:20px; color:#003366;">Top 5 Students with Most Violations</h4>
  <table class="data">
    <thead>
      <tr>
        <th>Student Name</th>
        <th>Program</th>
        <th>Total Offenses</th>
      </tr>
    </thead>
    <tbody>
      @forelse($top5Students as $s)
        <tr>
          <td style="padding: 6px; vertical-align: middle;">
            <div style="display: inline-block; vertical-align: middle;">
                @php
                    $photo = $s->user->profile_picture
                            ? \Illuminate\Support\Facades\Storage::disk('public')->path('profile-pictures/' . $s->user->profile_picture)
                            : public_path("default-pic/profile-{$s->user->sex}-pic.jpg");
                @endphp
                <img 
                src="{{ $photo }}" 
                alt="Profile Photo" 
                style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 1px solid #ccc;"
                >
            </div>
            <div style="display: inline-block; vertical-align: middle;">
                {{ $s->user->first_name . ' ' .  $s->user->middle_name . ' ' . $s->user->last_name }}
            </div>
          </td>
          <td>{{ $s->user->student->program->name }}</td>
          <td>{{ $s->total_offenses }}</td>
        </tr>
      @empty
        <tr>
          <td colspan="3" style="text-align:center;">No student data available</td>
        </tr>
      @endforelse
    </tbody>
  </table>

  {{-- INCIDENT TREND CHART --}}
  {{-- 
  <div class="chart">
      <h4 style="color:#003366;">Incident Trend Chart</h4>
      <img src="{{ $chartBase64 }}" alt="Incident Trend Chart">
  </div>
   --}}

  <footer>
    Generated on {{ now()->format('F d, Y') }}
  </footer>

</body>
</html>
