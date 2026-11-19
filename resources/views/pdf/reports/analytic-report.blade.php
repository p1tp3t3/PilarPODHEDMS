@extends('pdf.layouts.report')

{{--
  Analytical Report (ReportController::buildAnalyticsData), school-wide or
  for one student ($student set). Formal layout: numbered sections, a short
  written summary, figures and tables with captions, and a signature block.
  Charts are plain HTML/CSS (DomPDF draws them; no external chart service).
--}}

@section('title', ! empty($student) ? 'Individual Student Violation Analytical Report' : 'Analytical Report on Student Incidents and Violations')

@section('period')
  Covering the period from <strong>{{ \Carbon\Carbon::parse($from)->format('F j, Y') }}</strong>
  to <strong>{{ \Carbon\Carbon::parse($to)->format('F j, Y') }}</strong>
@endsection

@section('styles')
<style>
  /* Page margins: pdf/layouts/report. */
  body { margin: 0 !important; padding: 0 !important; font-family: "DejaVu Serif", "Times New Roman", serif; font-size: 11px; color: #000; }
  table { width: 100% !important; max-width: 100%; border-collapse: collapse; }
  tr { page-break-inside: avoid; }

  /* numbered sections */
  h3.sec { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #000; border-bottom: 1px solid #1f3a5f; padding-bottom: 3px; margin: 20px 0 8px; }
  h4.sub { font-size: 11px; font-weight: bold; color: #000; margin: 12px 0 4px; }
  p.text { text-align: justify; line-height: 1.6; margin: 0 0 6px; }
  .keep { page-break-inside: avoid; }
  .caption { font-size: 9.5px; font-style: italic; color: #000; text-align: center; margin: 4px 0 10px; }
  p.none { font-style: italic; color: #000; margin: 4px 0 8px; }

  /* formal data tables */
  table.data { margin-top: 4px; }
  table.data th { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; background: #e8edf3; color: #000; border: 1px solid #9aa9bb; padding: 5px 6px; text-align: left; }
  table.data td { border: 1px solid #c3ccd8; padding: 4px 6px; font-size: 10.5px; }
  table.data td.num, table.data th.num { text-align: right; }
  table.data td.c, table.data th.c { text-align: center; }
  table.data td.none { text-align: center; font-style: italic; color: #000; }

  /* key figures */
  table.figures td { border: 1px solid #c3ccd8; padding: 6px 8px; font-size: 10.5px; width: 25%; }
  table.figures td.k { background: #f4f6f9; color: #000; }
  table.figures td.v { font-weight: bold; color: #000; }

  /* student header */
  table.who td { border: none; padding: 0; vertical-align: middle; }
  td.who-photo { width: 76px; }
  td.who-photo img { width: 64px; height: 64px; border-radius: 32px; border: 1px solid #9aa9bb; }
  td.who-name .n { font-size: 15px; font-weight: bold; color: #000; }
  td.who-name .m { font-size: 10.5px; color: #000; margin-top: 2px; }

  /* charts (navy / slate, formal) */
  table.cols { margin-top: 6px; }
  table.cols td { border: none; padding: 0 3px; text-align: center; font-family: "DejaVu Sans", Arial, sans-serif; }
  table.cols td.col { vertical-align: bottom; height: 130px; border-bottom: 1px solid #7a8aa0; }
  table.cols td.lab { font-size: 8.5px; color: #000; padding-top: 3px; }
  table.cols .val { font-size: 8.5px; color: #000; margin-bottom: 2px; }
  table.cols .bar { width: 64%; margin: 0 auto; }
  table.hbars { margin-top: 6px; }
  table.hbars td { border: none; padding: 2px 4px; vertical-align: middle; font-family: "DejaVu Sans", Arial, sans-serif; }
  table.hbars td.hl { width: 40%; font-size: 9.5px; text-align: right; color: #000; }
  table.hbars td.hb { border-left: 1px solid #7a8aa0; }
  table.hbars td.hv { width: 6%; font-size: 9.5px; font-weight: bold; }
  table.hbars .bar { height: 11px; }
  table.stack { margin-top: 6px; border: 1px solid #7a8aa0; }
  table.stack td { height: 14px; padding: 0; }
  table.legend { margin-top: 4px; }
  table.legend td { border: none; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 9.5px; padding: 2px 8px 2px 0; }
  .swatch { display: inline-block; width: 9px; height: 9px; margin-right: 4px; border: 1px solid #555; }

  /* signatures */
  table.sign { margin-top: 36px; page-break-inside: avoid; }
  table.sign td { border: none; padding: 0 10px; vertical-align: bottom; width: 50%; }
  .sign-label { font-size: 10.5px; margin-bottom: 26px; }
  .sign-line { border-top: 1px solid #111; padding-top: 3px; text-align: center; font-weight: bold; font-size: 10.5px; min-height: 12px; }
  .sign-role { text-align: center; font-size: 9.5px; color: #000; }
</style>
@endsection

@section('content')
@php
  $rows = fn ($v) => collect($v)->map(fn ($r) => (array) $r)->values();
  $pct = fn ($n, $total) => $total ? round($n / $total * 100, 1) . '%' : '0%';
  $st = $student ?? null;

  // Formal palette: greys only (dark, mid, light), so the charts stay plain.
  $NAVY = '#222222';
  $SLATE = '#8a8a8a';
  $tone = ['pending' => '#b5b5b5', 'ongoing' => '#7a7a7a', 'resolved' => '#222222', 'rejected' => '#4d4d4d', 'revoked' => '#dcdcdc'];

  // Column chart.
  $columns = function (array $labels, array $values, string $color) {
      $max = max(1, ...array_map('intval', $values ?: [0]));
      $html = '<table class="cols"><tr>';
      foreach ($values as $v) {
          $bar = (int) round(((int) $v) / $max * 112);
          $html .= '<td class="col"><div class="val">' . (int) $v . '</div><div class="bar" style="height:' . max($bar, (int) $v ? 2 : 0) . 'px;background:' . $color . ' !important;"></div></td>';
      }
      $html .= '</tr><tr>';
      foreach ($labels as $l) { $html .= '<td class="lab">' . e($l) . '</td>'; }
      return $html . '</tr></table>';
  };
  // Horizontal bars: [[label, value, color?], ...].
  $bars = function ($items, string $color) {
      $items = collect($items);
      $max = max(1, (int) $items->max(fn ($i) => $i[1]));
      $html = '<table class="hbars">';
      foreach ($items as $i) {
          $w = round(((int) $i[1]) / $max * 100, 1);
          $html .= '<tr><td class="hl">' . e($i[0]) . '</td><td class="hb"><div class="bar" style="width:' . max($w, $i[1] ? 1 : 0) . '%;background:' . ($i[2] ?? $color) . ' !important;"></div></td><td class="hv">' . (int) $i[1] . '</td></tr>';
      }
      return $html . '</table>';
  };
  // One 100% bar split by share, with its legend: [[label, value, color], ...].
  $stack = function ($items) use ($pct) {
      $items = collect($items)->filter(fn ($i) => $i[1] > 0)->values();
      $total = $items->sum(fn ($i) => $i[1]);
      if (! $total) return '<p class="none">No data for this period.</p>';
      $html = '<table class="stack"><tr>';
      foreach ($items as $i) { $html .= '<td style="width:' . round($i[1] / $total * 100, 2) . '%;background:' . $i[2] . ' !important;"></td>'; }
      $html .= '</tr></table><table class="legend"><tr>';
      foreach ($items as $i) {
          $html .= '<td><span class="swatch" style="background:' . $i[2] . ' !important;"></span>' . e($i[0]) . ': <strong>' . (int) $i[1] . '</strong> (' . $pct($i[1], $total) . ')</td>';
      }
      return $html . '</tr></table>';
  };

  $fig = 0; $tab = 0;
  $period = \Carbon\Carbon::parse($from)->format('F j, Y') . ' to ' . \Carbon\Carbon::parse($to)->format('F j, Y');
  $plural = fn ($n, $word) => $n . ' ' . $word . ($n == 1 ? '' : 's');
@endphp

@if ($st)
  {{-- ===================== INDIVIDUAL STUDENT ===================== --}}
  @php
    $photoPath = $st['profile_picture'] ? storage_path('app/public/profile-pictures/' . basename($st['profile_picture'])) : null;
    if (! $photoPath || ! is_file($photoPath)) {
        $photoPath = public_path('default-pic/profile-' . (($st['sex'] ?? '') === 'f' ? 'f' : 'm') . '-pic.jpg');
    }
    $photo = is_file($photoPath) ? 'data:' . (mime_content_type($photoPath) ?: 'image/jpeg') . ';base64,' . base64_encode(file_get_contents($photoPath)) : null;
    $topType = collect($st['by_type'])->first();
  @endphp

  <h3 class="sec">I. Student Information</h3>
  <table class="who"><tr>
    @if ($photo)<td class="who-photo"><img src="{{ $photo }}" alt=""></td>@endif
    <td class="who-name">
      <div class="n">{{ $st['name'] }}</div>
      <div class="m">ID No. {{ $st['id_number'] ?? '—' }} &nbsp;·&nbsp; {{ $st['program'] ?? '—' }}{{ $st['year_level'] ? ', ' . $st['year_level'] : '' }}</div>
    </td>
  </tr></table>

  <h3 class="sec">II. Summary</h3>
  <p class="text">
    From {{ $period }}, {{ $st['name'] }} incurred <strong>{{ $plural($st['total'], 'violation') }}</strong>
    ({{ $st['major'] }} major and {{ $st['minor'] }} minor), and was named as the subject of {{ $plural($incidentCount, 'complaint') }}.
    @if ($topType) The most frequent violation was <em>{{ $topType['name'] }}</em> ({{ $plural($topType['total'], 'time') }}).@endif
    @if ($st['repeated_types']) {{ $plural($st['repeated_types'], 'violation type') }} {{ $st['repeated_types'] == 1 ? 'was' : 'were' }} committed more than once.@endif
    The student filed {{ $plural($st['complaints_filed'], 'complaint') }} during the same period.
  </p>
  <table class="figures">
    <tr><td class="k">Total Violations</td><td class="v">{{ $st['total'] }}</td><td class="k">Complaints Against</td><td class="v">{{ $incidentCount }}</td></tr>
    <tr><td class="k">Major Violations</td><td class="v">{{ $st['major'] }}</td><td class="k">Minor Violations</td><td class="v">{{ $st['minor'] }}</td></tr>
    <tr><td class="k">Complaints Filed</td><td class="v">{{ $st['complaints_filed'] }}</td><td class="k">Violation Types Repeated</td><td class="v">{{ $st['repeated_types'] }}</td></tr>
  </table>

  <div class="keep">
    <h3 class="sec">III. Violations Over Time</h3>
    {!! $columns($st['trend_labels'], $st['trend_values'], $NAVY) !!}
    <div class="caption">Figure {{ ++$fig }}. Number of violations per month.</div>
  </div>

  <div class="keep">
    <h3 class="sec">IV. Nature of Violations</h3>
    @if (count($st['by_type']))
      {!! $bars(collect($st['by_type'])->map(fn ($t) => [$t['name'], $t['total'], $t['major'] ? $NAVY : $SLATE]), $NAVY) !!}
      <div class="caption">Figure {{ ++$fig }}. Violations by type (dark: major, light: minor).</div>
    @else <p class="none">No violations recorded for this period.</p> @endif
    <h4 class="sub">Severity</h4>
    {!! $stack([['Major', $st['major'], $NAVY], ['Minor', $st['minor'], $SLATE]]) !!}
    <div class="caption">Figure {{ ++$fig }}. Major and minor violations.</div>
    <h4 class="sub">Status of Complaints Against the Student</h4>
    {!! $stack($rows($complaintStatus)->map(fn ($r) => [$r['label'], $r['total'], $tone[$r['status']] ?? $SLATE])) !!}
    <div class="caption">Figure {{ ++$fig }}. Complaints naming the student, by status.</div>
  </div>

  <h3 class="sec">V. Record of Violations</h3>
  <table class="data">
    <thead><tr><th class="c" style="width:6%;">No.</th><th>Violation</th><th style="width:12%;">Severity</th><th style="width:15%;">Case No.</th><th style="width:20%;">Date Issued</th></tr></thead>
    <tbody>
      @forelse ($st['violations'] as $i => $v)
        <tr>
          <td class="c">{{ $i + 1 }}</td><td>{{ $v['name'] }}</td><td>{{ $v['major'] ? 'Major' : 'Minor' }}</td>
          <td>{{ $v['case_number'] ?? '—' }}</td><td>{{ $v['issued_at'] ? \Carbon\Carbon::parse($v['issued_at'])->format('F j, Y') : '—' }}</td>
        </tr>
      @empty
        <tr><td colspan="5" class="none">No violations recorded for this period.</td></tr>
      @endforelse
    </tbody>
  </table>
  <div class="caption">Table {{ ++$tab }}. Violations of the student, most recent first.</div>

@else
  {{-- ===================== SCHOOL-WIDE ===================== --}}
  @php
    $topType = $rows($topViolationTypes)->first();
    $topProgram = collect($violationPerProgram)->first();
    $busiest = $rows($incidentsByWeekday)->sortByDesc('total')->first();
  @endphp

  <h3 class="sec">I. Summary</h3>
  <p class="text">
    From {{ $period }}, the Office of Student Affairs and Discipline received <strong>{{ $plural($incidentCount, 'complaint') }}</strong>,
    of which {{ $resolved }} ({{ $resolutionRate }}%) were resolved{{ $avgResolutionDays !== null ? ', in an average of ' . $avgResolutionDays . ' days' : '' }}.
    A total of <strong>{{ $plural($totalViolations, 'violation') }}</strong> were recorded against {{ $plural($studentsWithViolations, 'student') }},
    {{ $repeatOffenders }} of whom ({{ $repeatRate }}%) committed two or more.
    @if ($topType) The most frequent violation was <em>{{ $topType['name'] }}</em> ({{ $topType['total'] }}).@endif
    @if ($topProgram) The program with the most violations was {{ $topProgram->program }} ({{ $topProgram->total_violations }}).@endif
  </p>
  <table class="figures">
    <tr><td class="k">Total Incidents (Complaints)</td><td class="v">{{ $incidentCount }}</td><td class="k">Total Violations</td><td class="v">{{ $totalViolations }}</td></tr>
    <tr><td class="k">Resolved Complaints</td><td class="v">{{ $resolved }} ({{ $resolutionRate }}%)</td><td class="k">Average Time to Resolve</td><td class="v">{{ $avgResolutionDays !== null ? $avgResolutionDays . ' days' : '—' }}</td></tr>
    <tr><td class="k">Students with Violations</td><td class="v">{{ $studentsWithViolations }}</td><td class="k">Repeat Offenders (2 or more)</td><td class="v">{{ $repeatOffenders }} ({{ $repeatRate }}%)</td></tr>
  </table>

  <div class="keep">
    <h3 class="sec">II. Incidents</h3>
    {!! $columns($incidentTrendLabels, $incidentTrendValues, $NAVY) !!}
    <div class="caption">Figure {{ ++$fig }}. Number of complaints filed per month.</div>
    {!! $columns($rows($incidentsByWeekday)->pluck('label')->all(), $rows($incidentsByWeekday)->pluck('total')->all(), $SLATE) !!}
    <div class="caption">Figure {{ ++$fig }}. Complaints filed by day of the week{{ $busiest && $busiest['total'] ? ' (most on ' . $busiest['label'] . ')' : '' }}.</div>
  </div>

  <div class="keep">
    <h4 class="sub">Status of Complaints</h4>
    {!! $stack($rows($complaintStatus)->map(fn ($r) => [$r['label'], $r['total'], $tone[$r['status']] ?? $SLATE])) !!}
    <div class="caption">Figure {{ ++$fig }}. Complaints by status.</div>
  </div>

  <div class="keep">
    <h3 class="sec">III. Violations by Student Group</h3>
    @if (count($violationPerProgram))
      {!! $bars(collect($violationPerProgram)->map(fn ($r) => [$r->program, $r->total_violations]), $NAVY) !!}
      <div class="caption">Figure {{ ++$fig }}. Violations per program.</div>
    @else <p class="none">No violations recorded for this period.</p> @endif
    {!! $columns($rows($violationsByYearLevel)->pluck('label')->all(), $rows($violationsByYearLevel)->pluck('total')->all(), $NAVY) !!}
    <div class="caption">Figure {{ ++$fig }}. Violations per year level.</div>
  </div>

  <div class="keep">
    <table class="data">
      <thead><tr><th>Program</th><th class="num">Students with Violations</th><th class="num">Total Violations</th></tr></thead>
      <tbody>
        @forelse ($violationPerProgram as $r)
          <tr><td>{{ $r->program }}</td><td class="num">{{ $r->students_with_violations }}</td><td class="num">{{ $r->total_violations }}</td></tr>
        @empty
          <tr><td colspan="3" class="none">No violations recorded for this period.</td></tr>
        @endforelse
      </tbody>
    </table>
    <div class="caption">Table {{ ++$tab }}. Violations per program.</div>
    <h4 class="sub">By Sex</h4>
    {!! $stack($rows($violationsBySex)->map(fn ($r) => [$r['label'], $r['total'], ['Male' => $NAVY, 'Female' => $SLATE][$r['label']] ?? '#c3ccd8'])) !!}
    <div class="caption">Figure {{ ++$fig }}. Violations by sex of the student.</div>
  </div>

  <div class="keep">
    <h3 class="sec">IV. Nature of Violations</h3>
    {!! $stack($rows($violationsBySeverity)->map(fn ($r) => [$r['label'], $r['total'], $r['label'] === 'Major' ? $NAVY : $SLATE])) !!}
    <div class="caption">Figure {{ ++$fig }}. Major and minor violations.</div>
    @if (count($topViolationTypes))
      {!! $bars($rows($topViolationTypes)->map(fn ($r) => [$r['name'], $r['total'], $r['major'] ? $NAVY : $SLATE]), $NAVY) !!}
      <div class="caption">Figure {{ ++$fig }}. Most common violations (dark: major, light: minor).</div>
    @endif
  </div>

  <div class="keep">
    <h3 class="sec">V. Students with the Most Violations</h3>
    <table class="data">
      <thead><tr><th class="c" style="width:7%;">Rank</th><th>Name of Student</th><th>Program and Year</th><th class="num" style="width:15%;">Violations</th></tr></thead>
      <tbody>
        @forelse ($top5Students as $i => $s)
          @php
            $profile = $s->user?->profile;
            $enrollment = $s->user?->enrollments?->sortByDesc('id')->first();
            $year = [1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'][(int) ($enrollment->year_level ?? 0)] ?? '';
            $name = trim(preg_replace('/\s+/', ' ', ($profile->first_name ?? '') . ' ' . ($profile->middle_name ?? '') . ' ' . ($profile->last_name ?? '')));
          @endphp
          <tr>
            <td class="c">{{ $i + 1 }}</td><td>{{ $name ?: 'Unknown' }}</td>
            <td>{{ ($s->user?->program?->code ?? '—') . ($year ? ', ' . $year : '') }}</td><td class="num">{{ $s->total_offenses }}</td>
          </tr>
        @empty
          <tr><td colspan="4" class="none">No violations recorded for this period.</td></tr>
        @endforelse
      </tbody>
    </table>
    <div class="caption">Table {{ ++$tab }}. Top five students by number of violations.</div>
  </div>
@endif

  {{-- Signatures --}}
  <table class="sign">
    <tr>
      <td>
        <div class="sign-label">Prepared by:</div>
        <div class="sign-line">{{ $preparedBy ?? '' }}</div>
        <div class="sign-role">Prefect of Discipline</div>
      </td>
      <td>
        <div class="sign-label">Noted by:</div>
        <div class="sign-line">&nbsp;</div>
        <div class="sign-role">Signature over Printed Name</div>
      </td>
    </tr>
  </table>
@endsection
