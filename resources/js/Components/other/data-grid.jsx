import { useEffect, useMemo, useRef } from "react"
import { DataGrid as MuiDataGrid } from "@mui/x-data-grid"
import { useIsMobile } from "@/others/use-is-mobile"
import { useListsLoading } from "@/others/hooks/use-list-data"
import MobileCardList from "./mobile-card-list"
import EmptyTableOverlay from "./empty-table-overlay"

export * from "@mui/x-data-grid"

// MUI's own default `.MuiDataGrid-cell` doesn't use flexbox at all — it
// centers a cell's content by giving plain inline text a line-height equal
// to the row height. That trick only works for a single line of raw text;
// a custom `renderCell` returning block-level JSX (an icon + label, a date
// stacked over a semester tag, an actions row) ignores line-height
// entirely and just sits at the top of the cell instead. Forcing the cell
// itself into a flex container recentres that block content regardless of
// what it is — `!important` because MUI's own `styled()` rule for this
// exact selector otherwise wins the specificity tie. Applied to every
// table from one place instead of every individual `renderCell`.
const MAX_PAGE_SIZE = 100

const CELL_ALIGN_SX = {
    '& .MuiDataGrid-cell': {
        display: 'flex !important',
        alignItems: 'center !important',
        lineHeight: 'normal !important',
    },
}

// Sticky header while the PAGE scrolls: tables grow to fit their rows, so
// MUI's own sticky header (which only sticks inside the grid's scroller)
// never kicks in, and the wrappers' overflow:hidden rules out CSS sticky.
// Instead the toolbar (columns / filter / search) and the column headers
// are moved down together to sit just under the app's sticky header bar
// ([data-app-sticky], AuthLayout), stopping before the table's last row.
const useStickyGridHeader = (rootRef, enabled) => {
    useEffect(() => {
        const root = rootRef.current
        if (!enabled || !root) return
        let frame = null
        const update = () => {
            frame = null
            const toolbar = root.querySelector(".MuiDataGrid-toolbar")
            const headers = root.querySelector(".MuiDataGrid-topContainer")
            const parts = [toolbar, headers].filter(Boolean)
            if (!parts.length) return
            const barBottom = document.querySelector("[data-app-sticky]")?.getBoundingClientRect().bottom ?? 0
            const rect = root.getBoundingClientRect()
            const stuckHeight = parts.reduce((h, el) => h + el.offsetHeight, 0)
            // Never past the bottom: leave room for one row + the footer.
            const footer = root.querySelector(".MuiDataGrid-footerContainer")?.offsetHeight ?? 0
            const max = Math.max(0, rect.height - stuckHeight - footer - 52)
            const offset = Math.min(Math.max(barBottom - rect.top, 0), max)
            parts.forEach((el) => {
                el.style.transform = offset ? `translateY(${offset}px)` : ""
                el.classList.toggle("dg-stuck", offset > 0)
            })
        }
        const schedule = () => { if (frame == null) frame = requestAnimationFrame(update) }
        // capture: any scrolling element (the window or a layout container).
        window.addEventListener("scroll", schedule, { passive: true, capture: true })
        window.addEventListener("resize", schedule)
        const observer = new ResizeObserver(schedule)
        observer.observe(root)
        schedule()
        return () => {
            window.removeEventListener("scroll", schedule, { capture: true })
            window.removeEventListener("resize", schedule)
            observer.disconnect()
            if (frame != null) cancelAnimationFrame(frame)
        }
    }, [rootRef, enabled])
}

const STICKY_SX = {
    // Moved over the rows while stuck: on top, with a solid background.
    '& .MuiDataGrid-toolbar': { position: 'relative', zIndex: 4, bgcolor: 'var(--dm-surface, #fff)' },
    '& .MuiDataGrid-topContainer': { zIndex: 3 },
    '& .MuiDataGrid-topContainer.dg-stuck': { boxShadow: '0 4px 6px -4px rgba(0,0,0,0.18)' },
}

// Every table has a # column: one the table doesn't define itself is added
// first, numbering rows in their current (sorted / filtered) order and
// carrying on across pages.
const isIndexColumn = (c) => c.headerName === "#" || ["i", "index", "#"].includes(c.field)
const INDEX_COLUMN = {
    field: "__index",
    headerName: "#",
    width: 60,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: (params) => {
        const pm = params.api.state?.pagination?.paginationModel
        const offset = pm ? pm.page * pm.pageSize : 0
        return params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 + offset
    },
}
const withIndexColumn = (columns = []) => (columns.some(isIndexColumn) ? columns : [INDEX_COLUMN, ...columns])

// Wraps MUI's DataGrid so the toolbar's CSV/print export button (the
// download icon) never shows up, app-wide — every table still gets its
// columns/filter/search icons via `showToolbar`, the app just doesn't
// offer a raw data export. Import `DataGrid` from here instead of
// "@mui/x-data-grid" and nothing else needs to change; per-table overrides
// still work since `slotProps` passed in wins over these defaults, and any
// `sx` a caller passes is merged (as an array) rather than overwritten.
//
// On phones every table renders as a card list instead (MobileCardList),
// except editable grids (inline cell editing needs the real table) or a
// table that opts out with mobileCards={false}.
export const DataGrid = ({ slotProps, sx, slots, mobileCards = true, mobileSummary, followListLoading = true, ...props }) => {
    const isMobile = useIsMobile()
    // The page's lists are being (re)loaded: skeleton rows until it's done,
    // not the previous rows. followListLoading={false}: a table that isn't
    // one of the page's lists (its own data) opts out.
    const listsLoading = useListsLoading()
    if (listsLoading && followListLoading) {
        props = { ...props, loading: true, rows: [] }
    }
    const rootRef = useRef(null)
    const columns = useMemo(() => withIndexColumn(props.columns), [props.columns])
    const isEditable = !!props.processRowUpdate || (props.columns ?? []).some((c) => c.editable)

    const emptyTitle = props.localeText?.noRowsLabel ?? "No records found"
    const gridSlots = {
        noRowsOverlay: () => <EmptyTableOverlay title={emptyTitle} />,
        noResultsOverlay: () => <EmptyTableOverlay title="No matching results" subtitle="Try a different search or filter" />,
        ...slots,
    }

    if (props.pageSizeOptions) {
        props.pageSizeOptions = props.pageSizeOptions.filter((o) => (typeof o === "number" ? o : o?.value) <= MAX_PAGE_SIZE)
    }

    const asCards = isMobile && mobileCards && !isEditable
    useStickyGridHeader(rootRef, !asCards)

    if (asCards) {
        return <MobileCardList {...props} slots={gridSlots} mobileSummary={mobileSummary} />
    }

    return (
        <MuiDataGrid
            {...props}
            columns={columns}
            ref={rootRef}
            slots={gridSlots}
            sx={[
                CELL_ALIGN_SX,
                STICKY_SX,
                // The table stands on its own (no card around it): its own
                // white background (dark mode: the surface colour).
                { '--DataGrid-overlayHeight': props.loading && !props.rows?.length ? '320px' : '150px', bgcolor: 'var(--dm-surface, #fff)' },
                // Rows that size to their content (getRowHeight "auto") get
                // breathing room, so buttons and avatars don't touch the row edges.
                props.getRowHeight ? { '& .MuiDataGrid-cell': { py: '10px' } } : null,
                ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
            ].filter(Boolean)}
            slotProps={{
                ...slotProps,
                // While `loading`: skeleton rows (MUI's own), never the spinner.
                loadingOverlay: {
                    variant: 'skeleton',
                    noRowsVariant: 'skeleton',
                    ...slotProps?.loadingOverlay,
                },
                toolbar: {
                    csvOptions: { disableToolbarButton: true },
                    printOptions: { disableToolbarButton: true },
                    ...slotProps?.toolbar,
                },
            }}
        />
    )
}

export default DataGrid
