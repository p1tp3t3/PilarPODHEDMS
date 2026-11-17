@extends('pdf.layouts.report')

@section('title', 'Behavioural Analysis Report')

@section('period')
    Violation: <strong>{{ $violation }}</strong>
@endsection

@section('styles')
<style>
    body { font-family: "DejaVu Sans", Arial, sans-serif; color: #222; font-size: 10.5px; }
    .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1f3a5f; border-bottom: 1px solid #c9d2de; padding-bottom: 3px; margin: 16px 0 8px; }
    table.info { width: 100%; border-collapse: collapse; }
    table.info td { padding: 4px 6px; vertical-align: top; border: 1px solid #c9d2de; }
    table.info td.label { width: 18%; background: #eef1f5; font-weight: bold; color: #333; }
    table.info td.photo { width: 62px; padding: 4px; text-align: center; vertical-align: middle; }
    table.info td.photo img { width: 58px; height: 58px; object-fit: cover; }
    .verdict { border: 1px solid {{ $likely ? '#f5b5b5' : '#a7dcb9' }}; background: {{ $likely ? '#fdecec' : '#ecf8f0' }}; padding: 9px 12px; margin-top: 4px; }
    .verdict .title { font-size: 14px; font-weight: bold; color: {{ $likely ? '#b91c1c' : '#15803d' }}; }
    .verdict .sub { color: #555; margin-top: 2px; }
    .factor { margin: 0 0 7px; page-break-inside: avoid; }
    .factor .label { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
    .factor .body { line-height: 1.45; }
    table.reco { width: 100%; border-collapse: collapse; }
    table.reco td { padding: 5px 4px; vertical-align: top; border-bottom: 1px solid #e3e8ef; line-height: 1.45; }
    table.reco tr { page-break-inside: avoid; }
    table.reco td.num { width: 22px; color: #555; }
    table.reco .lead { font-weight: bold; color: #111; text-align: justify; }
    table.reco .rest { margin-top: 2px; color: #444; text-align: justify; }
    table.timeline { width: 100%; border-collapse: collapse; }
    table.timeline th, table.timeline td { border: 1px solid #333; padding: 4px 5px; vertical-align: top; line-height: 1.35; }
    table.timeline th { background: #eef1f5; text-align: left; }
    table.timeline tr { page-break-inside: avoid; }
    .muted { color: #666; }
    .note { margin-top: 18px; font-size: 9px; color: #666; font-style: italic; }
</style>
@endsection

@section('content')
    <div class="section-title">Student</div>
    <table class="info">
        <tr>
            @if ($student['photo'])
                <td class="photo" rowspan="2"><img src="{{ $student['photo'] }}" alt="Student photo"></td>
            @endif
            <td class="label">Name</td><td>{{ $student['name'] }}</td>
            <td class="label">ID Number</td><td>{{ $student['id_number'] ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td class="label">Program</td><td>{{ $student['program'] ?? 'N/A' }}</td>
            <td class="label">Year Level</td><td>{{ $student['year_level'] ?? 'N/A' }}</td>
        </tr>
    </table>

    <div class="section-title">Result</div>
    <div class="verdict">
        <div class="title">{{ $prediction }}</div>
        <div class="sub">Assessment of whether the student will commit "{{ $violation }}" again, based on the student's discipline record.</div>
    </div>

    <div class="section-title">Contributing Factors</div>
    @forelse ($insights as $f)
        <div class="factor">
            @if ($f['label'])<div class="label">{{ $f['label'] }}</div>@endif
            <div class="body">{{ $f['body'] }}</div>
        </div>
    @empty
        <div class="muted">No contributing factors.</div>
    @endforelse

    {{-- Recommendations always start on page 2. --}}
    <div class="section-title" style="page-break-before: always; margin-top: 0;">Recommendations</div>
    @if (count($recommendations))
        <table class="reco">
            @foreach ($recommendations as $i => $r)
                <tr>
                    <td class="num">{{ $i + 1 }}.</td>
                    <td>
                        <div class="lead">{{ $r['lead'] }}</div>
                        @if ($r['rest'])<div class="rest">{{ $r['rest'] }}</div>@endif
                    </td>
                </tr>
            @endforeach
        </table>
    @else
        <div class="muted">No recommendations.</div>
    @endif

    {{-- The timeline starts on its own page. --}}
    <div class="section-title" style="page-break-before: always; margin-top: 0;">Violation Timeline</div>
    <table class="timeline">
        <thead>
            <tr>
                <th style="width: 4%">#</th>
                <th style="width: 20%">Date</th>
                <th style="width: 14%">Case No.</th>
                <th>Incident Summary</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($timeline as $i => $t)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $t['date'] ? \Carbon\Carbon::parse($t['date'])->format('M j, Y g:i A') : 'N/A' }}</td>
                    <td>{{ $t['case_number'] ?? 'N/A' }}</td>
                    <td>{{ $t['summary'] ?: '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="4" class="muted" style="text-align:center">No violation history found.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="note">
        This report supports the Prefect of Discipline's judgment and does not replace it. Prepared by {{ $prepared_by }}.
    </div>
@endsection
