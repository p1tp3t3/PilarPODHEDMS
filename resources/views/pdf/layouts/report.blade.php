{{--
    Layout for generated report PDFs: the school letterhead and title, same
    as the complaint form's (pdf/complaint-subject), without its Reference
    and Case numbers.

    @extends('pdf.layouts.report')
    @section('title', 'Gate Pass Report')        - the report's name
    @section('period') ... @endsection             - optional line under it (dates / school year)
    @section('styles') <style>...</style> @endsection
    @section('content') ... @endsection
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title')</title>
    @yield('styles')
    <style>
        .report-title { text-align: center; font-family: "DejaVu Serif", "Times New Roman", serif; font-size: 16px; font-weight: bold; color: #111; letter-spacing: 3px; text-transform: uppercase; margin: 18px 0 2px; }
        .report-subtitle { text-align: center; font-family: "DejaVu Serif", "Times New Roman", serif; font-size: 10.5px; color: #555; margin: 0; }
        .report-period { text-align: center; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10.5px; color: #555; margin: 4px 0 0; }
        .report-heading { margin-bottom: 16px; }
        /* On every page, in the bottom margin: when it was generated, and the page. */
        .report-footer { position: fixed; bottom: -9mm; left: 0; right: 0; border-top: 1px solid #c9d2de; padding-top: 3px; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 8.5px; color: #666; }
        .report-footer table { width: 100% !important; border-collapse: collapse; border: none !important; margin: 0 !important; box-shadow: none !important; }
        .report-footer tr, .report-footer td { padding: 0 !important; border: none !important; background: none !important; font-size: 8.5px !important; }
        .report-footer .page-number:after { content: "Page " counter(page); }
        /* Narrow page margins for every report (they used to set their own, plus a body margin). */
        /* Narrow: 0.5in on every side (dompdf takes the page margin from html). */
        @page { margin: 0; }
        html { margin: 12.7mm !important; }
        body { margin: 0 !important; }
        /* Reports style every table/td; keep those off the letterhead. */
        .report-heading table { margin: 0 !important; border: none !important; box-shadow: none !important; }
        .report-heading table tr, .report-heading table td { background: none !important; border: none !important; }
        .report-heading table td { padding: 0 6px 0 0 !important; font-size: inherit !important; }
        /* The centered logo + text block: as wide as its content, in the middle. */
        .report-heading table.lh-center { width: auto !important; margin: 0 auto !important; }
    </style>
</head>
<body>
    {{-- Fixed elements must come first so dompdf repeats them on every page. --}}
    <div class="report-footer">
        <table>
            <tr>
                <td style="text-align: left;">Generated on {{ ($generated_at ?? now())->format('F j, Y \a\t g:i A') }}</td>
                <td style="text-align: center;">Office of Student Affairs and Discipline &middot; Pilar College of Zamboanga City, Inc.</td>
                <td style="text-align: right;" class="page-number"></td>
            </tr>
        </table>
    </div>

    <div class="report-heading">
        @include('pdf.partials.letterhead', ['centered' => true])
        <div class="report-title">@yield('title')</div>
        <div class="report-subtitle">Office of Student Affairs and Discipline</div>
        @hasSection('period')
            <div class="report-period">@yield('period')</div>
        @endif
    </div>

    @yield('content')
</body>
</html>
