{{--
    The formal, minimal look for the BODY of every generated document (not
    the letterhead, title or footer): serif text in black, plain tables with
    thin grey borders and bold headers, no tinted boxes, stripes, rounded
    corners or coloured labels. Charts are drawn in greys.

    Everything is scoped to .doc-body, the wrapper around a document's content
    (pdf/layouts/report wraps @yield('content'); the record documents wrap
    their own body). Included after a document's own styles so it wins.
    A chart segment that must keep its own grey sets it inline with !important.
--}}
<style>
    .doc-body, .doc-body * {
        font-family: "DejaVu Serif", "Times New Roman", serif !important;
        color: #000 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        text-shadow: none !important;
    }
    .doc-body * { background-color: transparent !important; background-image: none !important; }

    /* Headings and section titles: black, a thin rule under h2/h3/h4. */
    .doc-body h1, .doc-body h2, .doc-body h3, .doc-body h4 { font-weight: bold; }

    /* Tables: keep their own layout; recolour the borders, plain bold headers. */
    .doc-body table { border-color: #777 !important; }
    .doc-body th, .doc-body td { border-color: #777 !important; }
    .doc-body th { font-weight: bold !important; text-align: left; }
    /* Header cells that only had a coloured fill (no border) would float
       above the table once the fill is gone: same thin border as the cells. */
    .doc-body table.records th, .doc-body table.data th, .doc-body table.log th, .doc-body table.grid th { border: 0.75px solid #777 !important; }
    .doc-body thead th { border-bottom: 0.75px solid #333 !important; }

    /* Boxes that were tinted panels: just a thin border now. */
    .doc-body [class*="section"], .doc-body [class*="box"], .doc-body [class*="card"], .doc-body [class*="panel"] { border-color: #999 !important; }

    /* Secondary text: a dark grey, still easy to read. */
    .doc-body .muted, .doc-body .note, .doc-body .lbl, .doc-body .figure-sub, .doc-body .figure-empty,
    .doc-body .empty, .doc-body .none, .doc-body small, .doc-body .school-info { color: #000 !important; }

    /* Single-colour bar charts: dark grey on a light grey track. */
    .doc-body .bar { background-color: #555 !important; }
    .doc-body .bar-track { background-color: #e6e6e6 !important; }
</style>
