{{--
    A super admin report (SystemReportController::export): key figures, each
    chart as a table with bars, then the report's table.
    $title, $period, $cards, $charts, $table [columns, rows]
--}}
@extends('pdf.layouts.report')

@section('title', $title)

@section('period')
    {{ $period }}
@endsection

@section('styles')
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #000; }
    h4 { color: #000; margin: 14px 0 6px; font-size: 12.5px; }
    table.data { width: 100%; border-collapse: collapse; }
    table.data th { background: #003366; color: #fff; padding: 5px 6px; text-align: left; font-size: 10.5px; }
    table.data td { border: 1px solid #ddd; padding: 4px 6px; font-size: 10.5px; }
    table.data tr:nth-child(even) td { background: #f8f9fb; }
    table.data tr { page-break-inside: avoid; }
    .label { font-weight: bold; color: #000; background: #f3f7fb !important; }
    .figure { margin-top: 10px; page-break-inside: avoid; }
    .figure-title { font-weight: bold; color: #000; font-size: 11.5px; margin-bottom: 3px; }
    .figure-sub { font-weight: normal; color: #000; font-size: 10.5px; }
    .figure-empty { color: #000; font-style: italic; padding: 3px 0; }
    table.bars td { border: none !important; border-bottom: 1px solid #eee !important; background: none !important; }
    .bar-track { width: 100%; height: 9px; background: #eef2f7; }
    .bar { height: 9px; }
</style>
@endsection

@section('content')
    @if(count($cards ?? []))
        <h4>I. Key Figures</h4>
        <table class="data">
            <tbody>
            @foreach(array_chunk($cards, 3) as $group)
                <tr>
                    @foreach($group as $c)
                        <td class="label" style="width:20%;">{{ $c['label'] }}</td>
                        <td style="width:13%; font-weight:bold;">{{ $c['value'] }}@if(!empty($c['hint'])) <span style="font-weight:normal; color:#000;">({{ $c['hint'] }})</span>@endif</td>
                    @endforeach
                    @for($k = count($group); $k < 3; $k++)<td></td><td></td>@endfor
                </tr>
            @endforeach
            </tbody>
        </table>
    @endif

    @if(count($charts ?? []))
        <h4>II. Statistics</h4>
        @foreach($charts as $i => $chart)
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
                                <td style="width:26%;">{{ $r['label'] }}</td>
                                <td style="width:60%;"><div class="bar-track"><div class="bar" style="width: {{ round($r['value'] / $max * 100) }}%; background: {{ $r['color'] ?? '#1e3a8a' }};"></div></div></td>
                                <td style="width:7%; text-align:right; font-weight:bold;">{{ $r['value'] }}</td>
                                <td style="width:7%; text-align:right; color:#000;">{{ round($r['value'] / $sum * 100) }}%</td>
                            </tr>
                        @endforeach
                        </tbody>
                    </table>
                @else
                    <div class="figure-empty">No records for this period.</div>
                @endif
            </div>
        @endforeach
    @endif

    <h4>{{ count($charts ?? []) ? 'III' : 'I' }}. Records</h4>
    <table class="data">
        <thead>
            <tr>
                <th style="width:4%;">No.</th>
                @foreach($table['columns'] as $col)
                    <th>{{ $col['label'] }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($table['rows'] as $n => $row)
                <tr>
                    <td>{{ $n + 1 }}</td>
                    @foreach($table['columns'] as $col)
                        <td>{{ ($row[$col['field']] ?? null) === null || $row[$col['field']] === '' ? '—' : $row[$col['field']] }}</td>
                    @endforeach
                </tr>
            @empty
                <tr><td colspan="{{ count($table['columns']) + 1 }}" style="text-align:center;">No records.</td></tr>
            @endforelse
        </tbody>
    </table>
    <p style="margin-top:6px; font-weight:bold;">Total records: {{ count($table['rows']) }}</p>
@endsection
