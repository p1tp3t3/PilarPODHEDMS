@extends('pdf.layouts.report')

@section('title', 'Account & Enrollment Statistics Report')

@section('period')

      @if($all_school_years ?? false)
        <strong>All School Years</strong>
      @elseif($school_year_label)
        School Year <strong>{{ $school_year_label }}</strong>@if($semester_label) &mdash; <strong>{{ $semester_label }}</strong>@else (All Semesters)@endif
      @elseif($from && $to)
        From <strong>{{ \Carbon\Carbon::parse($from)->format('F d, Y') }}</strong>
        to <strong>{{ \Carbon\Carbon::parse($to)->format('F d, Y') }}</strong>
      @else
        All Time
      @endif
@endsection

@section('styles')
<style>
  body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 12px;
    margin: 25px;
    color: #000;
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
    color: #000;
  }

  .school-info {
    font-size: 11px;
    color: #000;
  }

  .title-box {
    text-align: center;
    margin: 15px 0 10px;
  }

  .title-box h2 {
    font-size: 16px;
    color: #000;
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
    color: #000;
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
    /* ---- Page fit (DomPDF) ----
       Margins live on @page so every page gets them, not just the first
       and last; content then fits inside the printable width and wraps
       instead of running off the edge. */
    /* Page margins: pdf/layouts/report (narrow). */
    body { margin: 0 !important; padding: 0 !important; height: auto !important; }
    html { height: auto !important; }
    .page { max-width: none !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
    table { width: 100% !important; max-width: 100%; }
    th, td { word-wrap: break-word; overflow-wrap: break-word; }
    th, td { font-size: 11px !important; padding: 5px 6px !important; line-height: 1.3 !important; }
    tr { page-break-inside: avoid; }
    img { max-width: 100%; }
    .label { color: #000; font-weight: bold; background: #f3f7fb; }
    .figure { margin-top: 12px; page-break-inside: avoid; }
    .figure-title { font-weight: bold; color: #000; font-size: 12px; margin-bottom: 4px; }
    .figure-sub { font-weight: normal; color: #000; font-size: 11px; }
    .figure-empty { color: #000; font-style: italic; font-size: 11px; padding: 4px 0; }
    table.bars { margin-top: 2px !important; }
    table.bars td { border: none !important; border-bottom: 1px solid #eee !important; }
    .bar-track { width: 100%; height: 10px; background: #eef2f7; }
    .bar { height: 10px; }
  </style>
@endsection

@section('content')

  {{-- KEY FIGURES (same as the Statistics page's cards) --}}
  <h4 style="margin-top:6px; color:#000;">I. Key Figures</h4>
  <table class="data figures">
    <tbody>
      @foreach(array_chunk($cards ?? [], 2) as $pair)
        <tr>
          @foreach($pair as $c)
            <td class="label" style="width:32%;">{{ $c['label'] }}</td>
            <td style="width:18%; font-weight:bold;">{{ $c['value'] }}@if(!empty($c['hint'])) <span style="font-weight:normal; color:#000;">({{ $c['hint'] }})</span>@endif</td>
          @endforeach
          @if(count($pair) === 1)<td></td><td></td>@endif
        </tr>
      @endforeach
    </tbody>
  </table>

  {{-- RECORDS: ACCOUNTS PER PROGRAM --}}
  <h4 style="margin-top:15px; color:#000;">II. Accounts per Program</h4>
  <table class="data">
    <thead>
      <tr>
        <th>Program</th>
        <th>Program Name</th>
        <th style="text-align:center;">Students</th>
        <th style="text-align:center;">Program Heads</th>
        <th style="text-align:center;">Faculty</th>
        <th style="text-align:center;">Total</th>
      </tr>
    </thead>
    <tbody>
      @forelse($program_accounts ?? [] as $row)
        <tr>
          <td>{{ $row['program'] }}</td>
          <td>{{ $row['name'] }}</td>
          <td style="text-align:center;">{{ $row['students'] }}</td>
          <td style="text-align:center;">{{ $row['program_heads'] }}</td>
          <td style="text-align:center;">{{ $row['faculty'] }}</td>
          <td style="text-align:center; font-weight:bold;">{{ $row['total'] }}</td>
        </tr>
      @empty
        <tr><td colspan="6" style="text-align:center;">No data available</td></tr>
      @endforelse
    </tbody>
  </table>

  {{-- FIGURES: each chart of the Statistics page as a table with bars --}}
  <h4 style="margin-top:15px; color:#000;">III. Statistics</h4>
  @foreach(($charts ?? []) as $i => $chart)
    @php
      $rows = $chart['data'] ?? [];
      $max = max(1, collect($rows)->max('value') ?? 1);
      $sum = max(1, collect($rows)->sum('value'));
    @endphp
    <div class="figure">
      <div class="figure-title">Figure {{ $i + 1 }}. {{ $chart['title'] }}@if(!empty($chart['subtitle'])) <span class="figure-sub">&mdash; {{ $chart['subtitle'] }}</span>@endif</div>
      @if(count($rows))
        <table class="data bars">
          <tbody>
            @foreach($rows as $r)
              <tr>
                <td style="width:30%;">{{ $r['label'] }}</td>
                <td style="width:55%;">
                  <div class="bar-track"><div class="bar" style="width: {{ round($r['value'] / $max * 100) }}%; background: {{ $r['color'] ?? '#1e3a8a' }};"></div></div>
                </td>
                <td style="width:7%; text-align:right; font-weight:bold;">{{ $r['value'] }}</td>
                <td style="width:8%; text-align:right; color:#000;">{{ round($r['value'] / $sum * 100) }}%</td>
              </tr>
            @endforeach
          </tbody>
        </table>
      @else
        <div class="figure-empty">No records for this period.</div>
      @endif
    </div>
  @endforeach

@endsection
