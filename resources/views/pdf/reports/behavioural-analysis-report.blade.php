@extends('pdf.layouts.report')

@section('title', 'Behavioural Analysis Report')

@section('period')
    Violation: <strong>{{ $violation }}</strong>
@endsection

{{-- Body: a plain, formal document — serif text in black, numbered sections
     under thin rules, plain bordered tables, no coloured boxes. The header and
     footer come from pdf.layouts.report and are unchanged. --}}
@section('styles')
<style>
    body { font-family: "DejaVu Serif", "Times New Roman", serif; color: #111; font-size: 10.5px; line-height: 1.5; }
    .section-title { font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #111; border-bottom: 0.75px solid #111; padding-bottom: 2px; margin: 18px 0 8px; }
    .section-title:first-child { margin-top: 6px; }

    table.info { width: 100%; border-collapse: collapse; }
    table.info td { padding: 4px 6px; vertical-align: top; border: 0.75px solid #777; }
    table.info td.label { width: 17%; font-weight: bold; }
    table.info td.photo { width: 62px; padding: 3px; text-align: center; vertical-align: middle; }
    table.info td.photo img { width: 58px; height: 58px; object-fit: cover; }

    .result { margin: 2px 0 0; }
    .result .value { font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .result .sub { margin-top: 3px; text-align: justify; }

    .factor { margin: 0 0 6px; text-align: justify; page-break-inside: avoid; }
    .factor .label { font-weight: bold; }

    table.reco { width: 100%; border-collapse: collapse; }
    table.reco tr { page-break-inside: avoid; }
    table.reco td { padding: 0 0 9px; vertical-align: top; }
    table.reco td.num { width: 20px; }
    table.reco .lead { font-weight: bold; text-align: justify; }
    table.reco .rest { margin-top: 2px; text-align: justify; }

    table.timeline { width: 100%; border-collapse: collapse; }
    table.timeline th, table.timeline td { border: 0.75px solid #777; padding: 4px 6px; vertical-align: top; line-height: 1.4; }
    table.timeline th { font-weight: bold; text-align: left; }
    table.timeline tr { page-break-inside: avoid; }

    .muted { color: #444; font-style: italic; }


    .note { margin-top: 18px; font-size: 9px; color: #444; font-style: italic; text-align: justify; }
</style>
@endsection

@section('content')
    <div class="section-title">I. Student Information</div>
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

    <div class="section-title">II. Assessment Result</div>
    <div class="result">
        <div><span class="value">{{ $prediction }}</span></div>
        <div class="sub">Assessment of whether the student will commit "{{ $violation }}" again, based on the student's discipline record.</div>
    </div>

    <div class="section-title">III. Contributing Factors</div>
    @forelse ($insights as $f)
        <div class="factor">
            @if ($f['label'])<span class="label">{{ $f['label'] }}.</span> @endif{{ $f['body'] }}
        </div>
    @empty
        <div class="muted">No contributing factors.</div>
    @endforelse

    {{-- Recommendations always start on page 2. --}}
    <div class="section-title" style="page-break-before: always; margin-top: 0;">IV. Recommendations</div>
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
    <div class="section-title" style="page-break-before: always; margin-top: 0;">V. Violation Timeline</div>
    <table class="timeline">
        <thead>
            <tr>
                <th style="width: 5%">No.</th>
                <th style="width: 27%">Date</th>
                <th style="width: 12%">Case No.</th>
                <th>Incident Summary</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($timeline as $i => $t)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $t['date'] ? \Carbon\Carbon::parse($t['date'])->format('F j, Y, g:i A') : 'N/A' }}</td>
                    <td>{{ $t['case_number'] ?? 'N/A' }}</td>
                    <td style="text-align: justify;">{{ $t['summary'] ?: '—' }}</td>
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
