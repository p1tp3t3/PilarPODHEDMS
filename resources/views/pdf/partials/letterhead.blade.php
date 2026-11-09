{{--
    School letterhead for formal PDF documents.
    $meta: label => value pairs shown on the right (e.g. Reference No.).
    $centered: the logo and school text centered together on the page (reports).
--}}
@php($centered = $centered ?? false)
@if ($centered)
    {{-- Logo and school text side by side, centered together on the page. --}}
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="text-align: center;">
                <table class="lh-center" style="margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td style="width: 74px; vertical-align: middle;">
                            <img src="{{ public_path('default-pic/pilar-pdf.png') }}" alt="Pilar College" style="width: 66px; height: 66px;">
                        </td>
                        <td style="vertical-align: middle; text-align: center; font-family: 'DejaVu Serif', 'Times New Roman', serif;">
                            <div style="font-size: 16px; font-weight: bold; color: #1f3a5f; letter-spacing: 0.3px;">Pilar College of Zamboanga City, Inc.</div>
                            <div style="font-size: 10.5px; color: #444; margin-top: 1px;">R.T. Lim Boulevard, Zamboanga City, 7000 &middot; College Department</div>
                            <div style="font-size: 11px; font-weight: bold; color: #1f3a5f; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px;">Office of Student Affairs and Discipline</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
@else
<table style="width: 100%; border-collapse: collapse;">
    <tr>
        <td style="width: 74px; vertical-align: middle;">
            <img src="{{ public_path('default-pic/pilar-pdf.png') }}" alt="Pilar College" style="width: 66px; height: 66px;">
        </td>
        {{-- Serif like the paper forms, whatever the page's own font. --}}
        <td style="vertical-align: middle; font-family: 'DejaVu Serif', 'Times New Roman', serif;">
            <div style="font-size: 16px; font-weight: bold; color: #1f3a5f; letter-spacing: 0.3px;">Pilar College of Zamboanga City, Inc.</div>
            <div style="font-size: 10.5px; color: #444; margin-top: 1px;">R.T. Lim Boulevard, Zamboanga City, 7000 &middot; College Department</div>
            <div style="font-size: 11px; font-weight: bold; color: #1f3a5f; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px;">Office of Student Affairs and Discipline</div>
        </td>
        <td style="vertical-align: middle; text-align: right; font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 9.5px; color: #333; line-height: 1.5;">
            @foreach ($meta ?? [] as $label => $value)
                {{ $label }} <strong style="color: #111;">{{ $value ?? 'N/A' }}</strong><br>
            @endforeach
        </td>
    </tr>
</table>
@endif
<div style="height: 3px; background: #1f3a5f; margin-top: 8px;"></div>
<div style="height: 1px; background: #b8892b; margin-top: 2px;"></div>
