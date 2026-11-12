import { DataGrid as MuiDataGrid } from "@mui/x-data-grid"
import { useIsMobile } from "@/others/use-is-mobile"
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
export const DataGrid = ({ slotProps, sx, slots, mobileCards = true, mobileSummary, ...props }) => {
    const isMobile = useIsMobile()
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

    if (isMobile && mobileCards && !isEditable) {
        return <MobileCardList {...props} slots={gridSlots} mobileSummary={mobileSummary} />
    }

    return (
        <MuiDataGrid
            {...props}
            slots={gridSlots}
            sx={[CELL_ALIGN_SX, { '--DataGrid-overlayHeight': '150px' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
            slotProps={{
                ...slotProps,
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
