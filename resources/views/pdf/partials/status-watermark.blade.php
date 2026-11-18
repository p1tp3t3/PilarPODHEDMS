{{--
    A large, faint, tilted status stamp across every page of a document
    that isn't final (pending, rejected, revoked), like the absent form's
    "approved" watermark. Any other status: nothing.
    @include('pdf.partials.status-watermark', ['status' => 'pending'])
--}}
@php
    $wmStatus = strtolower(trim((string) ($status ?? '')));
    // A plain grey stamp for every non-final status (formal, not coloured).
    $wmColor = in_array($wmStatus, ['pending', 'rejected', 'revoked'], true) ? '#555555' : null;
@endphp
@if ($wmColor)
<style>
    .status-watermark { position: fixed; top: 300px; left: 0; right: 0; text-align: center; }
    .status-watermark span {
        display: inline-block; padding: 10px 34px;
        border: 4px double {{ $wmColor }}; color: {{ $wmColor }};
        font-family: "DejaVu Serif", "Times New Roman", serif; font-size: 72px; font-weight: bold; letter-spacing: 8px;
        opacity: 0.13; transform: rotate(-20deg);
    }
</style>
<div class="status-watermark"><span>{{ strtoupper($wmStatus) }}</span></div>
@endif
