@extends('pdf.layouts.report')

@section('title', 'Security Log Report')

@section('period')
    <strong>{{ $period }}</strong>
@endsection

@section('styles')
<style>
    body { font-family: "DejaVu Sans", Arial, sans-serif; color: #222; }
    .summary { width: 100%; border-collapse: collapse; margin: 0 0 10px; }
    .summary td { width: 20%; border: 1px solid #c9d2de; padding: 6px 8px; font-size: 10px; text-align: center; }
    .summary .num { display: block; font-size: 15px; font-weight: bold; color: #111; }
    .summary .lbl { color: #666; }
    table.log { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.log th, table.log td { border: 1px solid #333; padding: 4px 5px; font-size: 9px; line-height: 1.3; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
    table.log th { background: #eef1f5; text-align: left; font-weight: bold; }
    table.log tr { page-break-inside: avoid; }
    .sev { font-weight: bold; text-transform: uppercase; font-size: 8px; }
    .sev-high { color: #b91c1c; }
    .sev-medium { color: #c2410c; }
    .sev-low { color: #4b5563; }
    .muted { color: #666; }
    .empty { text-align: center; padding: 14px; color: #666; }
</style>
@endsection

@section('content')
    <table class="summary">
        <tr>
            <td><span class="num">{{ $summary['total'] }}</span><span class="lbl">Total Attempts</span></td>
            <td><span class="num" style="color:#b91c1c">{{ $summary['high'] }}</span><span class="lbl">High Severity</span></td>
            <td><span class="num" style="color:#c2410c">{{ $summary['medium'] }}</span><span class="lbl">Medium Severity</span></td>
            <td><span class="num">{{ $summary['low'] }}</span><span class="lbl">Low Severity</span></td>
            <td><span class="num">{{ $summary['ips'] }}</span><span class="lbl">Unique IP Addresses</span></td>
        </tr>
    </table>

    <table class="log">
        <thead>
            <tr>
                <th style="width: 3%">#</th>
                <th style="width: 11%">Date / Time</th>
                <th style="width: 7%">Severity</th>
                <th style="width: 11%">Type</th>
                <th style="width: 26%">Description</th>
                <th style="width: 10%">IP Address</th>
                <th style="width: 11%">User</th>
                <th style="width: 21%">Request</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($entries as $i => $e)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ \Carbon\Carbon::parse($e['datetime'])->format('M j, Y g:i:s A') }}</td>
                    <td><span class="sev sev-{{ $e['severity'] }}">{{ $e['severity'] }}</span></td>
                    <td>{{ $e['type_label'] }}</td>
                    <td>{{ $e['message'] }}</td>
                    <td>{{ $e['ip'] ?? '—' }}</td>
                    <td>
                        @if ($e['username'])
                            {{ $e['username'] }}<br><span class="muted">{{ \Illuminate\Support\Str::headline($e['role'] ?? '') }}</span>
                        @else
                            <span class="muted">Guest</span>
                        @endif
                    </td>
                    <td>{{ $e['method'] }} {{ \Illuminate\Support\Str::limit($e['url'] ?? '', 120) }}</td>
                </tr>
            @empty
                <tr><td colspan="8" class="empty">No security events match these filters.</td></tr>
            @endforelse
        </tbody>
    </table>
@endsection
