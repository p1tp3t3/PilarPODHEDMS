{{--
    A boxed note in the formal email (a reason, a code, a link).
    $label  small heading over the box (optional)
    $tone   'neutral' (default) | 'danger'
    $slot   the box's content (pass as $content: already-safe HTML)
--}}
@php
    $tone = $tone ?? 'neutral';
    [$bg, $bd, $fg] = $tone === 'danger' ? ['#fbf3f3', '#e3b9b9', '#8a1c1c'] : ['#f5f7fa', '#d9dde3', '#1f3a5f'];
@endphp
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 18px; border-collapse:collapse;">
    <tr>
        <td style="background-color:{{ $bg }}; border-left:3px solid {{ $fg }}; border-top:1px solid {{ $bd }}; border-right:1px solid {{ $bd }}; border-bottom:1px solid {{ $bd }}; padding:12px 16px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#000; text-align:left;">
            @if (!empty($label))
                <div style="font-size:11.5px; font-weight:bold; color:#000; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:4px;">{{ $label }}</div>
            @endif
            {!! $content !!}
        </td>
    </tr>
</table>
