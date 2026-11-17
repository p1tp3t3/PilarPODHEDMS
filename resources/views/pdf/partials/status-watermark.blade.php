{{--
    A large, faint, tilted status stamp across every page of a document
    that isn't final (pending, rejected, revoked), like the absent form's
    "approved" watermark. Any other status: nothing.
    @include('pdf.partials.status-watermark', ['status' => 'pending'])
--}}
@php
    $wmStatus = strtolower(trim((string) ($status ?? '')));
    $wmColor = ['pending' => '#b7791f', 'rejected' => '#c53030', 'revoked' => '#4a5568'][$wmStatus] ?? null;
@endphp
@if ($wmColor)
<style>
    .status-watermark { position: fixed; top: 300px; left: 0; right: 0; text-align: center; }
    .status-watermark span {
        display: inline-block; padding: 10px 34px;
        border: 7px double {{ $wmColor }}; border-radius: 14px; color: {{ $wmColor }};
        font-family: "DejaVu Sans", Arial, sans-serif; font-size: 76px; font-weight: bold; letter-spacing: 8px;
        opacity: 0.16; transform: rotate(-20deg);
    }
</style>
<div class="status-watermark"><span>{{ strtoupper($wmStatus) }}</span></div>
@endif
