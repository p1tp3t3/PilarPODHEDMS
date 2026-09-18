<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Account & Enrollment Statistics Report</title>
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

  footer {
    margin-top: 25px;
    font-size: 11px;
    text-align: right;
    color: #555;
  }

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
    <h2>Account & Enrollment Statistics Report</h2>
    <div style="font-size: 11px; color: #555;">
      @if($school_year_label)
        School Year <strong>{{ $school_year_label }}</strong>@if($semester_label) &mdash; <strong>{{ $semester_label }}</strong>@else (All Semesters)@endif
      @elseif($from && $to)
        From <strong>{{ \Carbon\Carbon::parse($from)->format('F d, Y') }}</strong>
        to <strong>{{ \Carbon\Carbon::parse($to)->format('F d, Y') }}</strong>
      @else
        All Time
      @endif
    </div>
  </div>

  <div class="summary-box">
    <table class="summary-grid">
      <tr>
        <td class="label">Students:</td>
        <td>{{ $students }}</td>
        <td class="label">Teaching Staff:</td>
        <td>{{ $teaching_staff }}</td>
      </tr>
      <tr>
        <td class="label">Non-Teaching Staff:</td>
        <td>{{ $non_teaching_staff }}</td>
        <td class="label">Parents:</td>
        <td>{{ $parents }}</td>
      </tr>
    </table>
  </div>

  {{-- STUDENTS PER PROGRAM --}}
  <h4 style="margin-top:15px; color:#003366;">Students Per Program</h4>
  <table class="data">
    <thead>
      <tr>
        <th>Program</th>
        <th>Students</th>
      </tr>
    </thead>
    <tbody>
      @forelse($students_per_program as $row)
        <tr>
          <td>{{ is_array($row) ? $row['program'] : $row->program }}</td>
          <td>{{ is_array($row) ? $row['total'] : $row->total }}</td>
        </tr>
      @empty
        <tr>
          <td colspan="2" style="text-align:center;">No data available</td>
        </tr>
      @endforelse
    </tbody>
  </table>

  <footer>
    Generated on {{ now()->format('F d, Y g:i A') }}
  </footer>

</body>
</html>
