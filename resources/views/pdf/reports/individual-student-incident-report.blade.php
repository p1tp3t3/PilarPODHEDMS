<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Student Incident Report</title>
<style>
  body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 12px;
    margin: 12px;
    color: #222;
  }

  /* --- HEADER --- */
  .report-header {
    width: 100%;
    border-bottom: 3px solid #003366;
    margin-bottom: 15px;
    padding-bottom: 5px;
  }

  .report-header td {
    vertical-align: middle;
  }

  .report-header img {
    width: 80px;
  }

  .school-name {
    font-size: 16px;
    font-weight: bold;
    color: #003366;
    margin-bottom: 2px;
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

  /* --- PROFILE BOX --- */
  .profile-section {
    border: 1px solid #003366;
    border-radius: 4px;
    background-color: #f3f7fb;
    padding: 8px 10px;
    margin-top: 10px;
  }

  .profile-table {
    width: 100%;
    border-collapse: collapse;
  }

  .profile-table td {
    padding: 5px 8px;
    vertical-align: top;
    font-size: 12px;
  }

  .profile-table .label {
    font-weight: bold;
    color: #003366;
    width: 25%;
  }

  .profile-photo {
    width: 110px;
    text-align: center;
  }

  .profile-photo img {
    width: 100px;
    height: 100px;
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid #ccc;
  }

  /* --- INCIDENTS TABLE --- */
  .incidents {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
  }

  .incidents th {
    background-color: #003366;
    color: white;
    padding: 6px;
    text-align: left;
    font-size: 12px;
  }

  .incidents td {
    border: 1px solid #ddd;
    padding: 6px;
    font-size: 11px;
  }

  .incidents tr:nth-child(even) {
    background-color: #f8f9fb;
  }

  .category-minor {
    color: #856404;
  }

  .category-major {
    color: #b71c1c;
    font-weight: bold;
  }

  /* --- SUMMARY --- */
  .summary-row {
    display: flex;
    gap: 12px;
    margin-top: 14px;
  }

  .summary-box {
    flex: 1;
    text-align: center;
    background-color: #f3f7fb;
    border: 1px solid #003366;
    border-radius: 4px;
    padding: 8px;
  }

  .summary-count {
    display: block;
    font-size: 20px;
    font-weight: bold;
    color: #003366;
  }

  .summary-label {
    display: block;
    font-size: 10.5px;
    color: #555;
  }

  /* --- FOOTER / SIGNATURE --- */
  .footer {
    margin-top: 40px;
    display: flex;
    gap: 30px;
  }

  .sig {
    flex: 1;
    text-align: center;
  }

  .sig .line {
    border-top: 1px solid #444;
    margin-bottom: 4px;
    margin-top: 30px;
  }

  .sig p {
    margin: 0;
    font-size: 11px;
    color: #444;
  }

  hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 15px 0;
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
    <h2>Student Incident Report</h2>
    <div style="font-size: 11px; color: #555;">
      @if(!empty($school_year))
        School Year <strong>{{ $school_year }}</strong>
      @else
        From <strong>{{ \Carbon\Carbon::parse($from)->format('F d, Y') }}</strong>
        to <strong>{{ \Carbon\Carbon::parse($to)->format('F d, Y') }}</strong>
      @endif
    </div>
  </div>

  {{-- STUDENT PROFILE --}}
  <div class="profile-section">
    <table class="profile-table">
      <tr>
        {{-- PROFILE PICTURE --}}
        <td class="profile-photo" rowspan="3">
          <img 
            src="{{ $profile_picture }}" 
            alt="Student Photo">
        </td>

        {{-- NAME + ID --}}
        <td class="label">Student Name:</td>
        <td>{{ $student_name }}</td>
        <td class="label">Student ID:</td>
        <td>{{ $student_id }}</td>
      </tr>
      <tr>
        <td class="label">Program:</td>
        <td>{{ $program }}</td>
        <td class="label">Status:</td>
        <td>{{ $civil_status }}</td>
      </tr>
    </table>
  </div>

  {{-- SUMMARY --}}
  @if($type == 'incident')
    @php
      $totalIncidents = count($data);
      $totalViolations = collect($data)->sum(fn($inc) => count($inc['violations']));
    @endphp
    <div class="summary-row">
      <div class="summary-box">
        <span class="summary-count">{{ $totalIncidents }}</span>
        <span class="summary-label">Total Incident{{ $totalIncidents == 1 ? '' : 's' }}</span>
      </div>
      <div class="summary-box">
        <span class="summary-count">{{ $totalViolations }}</span>
        <span class="summary-label">Total Violation{{ $totalViolations == 1 ? '' : 's' }} Charged</span>
      </div>
    </div>
  @endif

  {{-- INCIDENT RECORDS --}}
  <h4 style="margin-top:15px; color:#003366;">Incident Records</h4>

  @if($type == 'incident')
    @forelse ($data as $incident)
      <table class="incidents" style="margin-top: {{ $loop->first ? '0' : '14px' }};">
        <thead>
          <tr>
            <th style="width:5%;">#</th>
            <th style="width:14%;">Student ID</th>
            <th style="width:15%;">Complaint No.</th>
            <th style="width:14%;">Case No.</th>
            <th style="width:32%;">Incident</th>
            <th>Date / Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ $incident['i'] }}</td>
            <td>{{ $incident['student_id'] }}</td>
            <td>{{ $incident['complaint_number'] }}</td>
            <td>{{ $incident['case_number'] }}</td>
            <td>{{ $incident['incident'] }}</td>
            <td>{{ $incident['date_time'] }}</td>
          </tr>
          <tr>
            <td colspan="6" style="padding:0;">
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="width:50%; background-color:#f3f7fb; color:#003366;">Violation</th>
                    <th style="width:15%; background-color:#f3f7fb; color:#003366;">Occurrence</th>
                    <th style="background-color:#f3f7fb; color:#003366;">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  @forelse ($incident['violations'] as $v)
                    <tr>
                      <td>{{ $v['violation_name'] }}</td>
                      <td>{{ $v['occurrence'] }}</td>
                      <td>{{ $v['penalty'] }}</td>
                    </tr>
                  @empty
                    <tr>
                      <td colspan="3" style="text-align:center; color:#888; font-style:italic;">No violation formally charged for this incident.</td>
                    </tr>
                  @endforelse
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td colspan="6" style="background-color:#fbfcfe; font-size:10.5px; color:#444;">
              <strong>Reported By:</strong> {{ $incident['complainant'] }}
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <strong>Resolved On:</strong> {{ $incident['resolved_at'] }}
              @if(!empty($incident['summary']))
                <br><strong>Prefect's Remark:</strong> {{ $incident['summary'] }}
              @endif
            </td>
          </tr>
        </tbody>
      </table>
    @empty
      <table class="incidents">
        <tbody>
          <tr>
            <td style="text-align:center; padding:10px;">No incident records found.</td>
          </tr>
        </tbody>
      </table>
    @endforelse

    {{-- SIGNATURE --}}
    <div class="footer">
      <div class="sig">
        <div class="line"></div>
        <p>Prefect of Discipline</p>
      </div>
      <div class="sig">
        <div class="line"></div>
        <p>Date Generated: {{ now()->format('F j, Y g:i A') }}</p>
      </div>
    </div>
  @else
    <table class="incidents">
      <thead>
        <tr>
          <th style="width:4%;">#</th>
          <th style="width:16%;">Violation</th>
          <th style="width:10%;">Status</th>
          <th style="width:10%;">Occurrence</th>
          <th style="width:20%;">Penalty</th>
          <th style="width:15%;">Date / Time</th>
        </tr>
      </thead>
      <tbody>
        @forelse ($data as $d)
          <tr>
            <td>{{ $d['i'] }}</td>
            <td>{{ $d['violation'] }}</td>
            <td>{{ $d['status'] }}</td>
            <td>{{ $d['occurrence'] }}</td>
            <td>{{ $d['penalty'] }}</td>
            <td>{{ $d['date_time'] }}</td>
          </tr>
        @empty
          <tr>
            <td colspan="6" style="text-align:center; padding:10px;">No violation records found.</td>
          </tr>
        @endforelse
      </tbody>
    </table>
  @endif
</body>
</html>
