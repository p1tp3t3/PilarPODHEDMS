import { Link } from "@inertiajs/react"
import { Card, CardActionArea, IconButton } from "@mui/material"
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded"
import StatusPill from "@/Components/list/status-pill"

// "Up next" panel on the dashboards: one column per kind of request, each
// showing the oldest one still waiting (first in, first out). Same MUI card
// and click effect as the quantity cards.
//
// columns: [{ key, label, status, href, item, empty }]
//   label: the small line on top ("Pending complaint", "My complaint"): singular, no counts.
//   status: optional; a status pill beside the item's number (My requests).
//   item: { number, created_at } or null (shows `empty`); no description line.
const daysAgo = (date) => {
    const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
    return days === 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`
}


const UpNextColumn = ({ col }) => {
    const c = col.item
    const label = col.label
    return (
        <CardActionArea component={Link} href={col.href} sx={{ bgcolor: "background.paper", display: "flex", alignItems: "flex-start", gap: 1, px: 2, py: 1.5, minWidth: 0, height: "100%", textAlign: "left" }}>
            <div className="min-w-0 flex-1">
                <div className="text-[0.75em] text-gray-500">{label}</div>
                {c ? (
                    <>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-gray-800 truncate">{c.number}</span>
                            {col.status && <span className="shrink-0 text-[0.7em]"><StatusPill status={col.status} /></span>}
                        </div>
                        <div className="text-[0.72em] text-gray-400">{daysAgo(c.created_at)}</div>
                    </>
                ) : (
                    <div className="text-[0.85em] text-gray-400">{col.empty ?? "Nothing waiting"}</div>
                )}
            </div>
            {/* MUI arrow; a span (the whole item is the link), not a nested button. */}
            <IconButton component="span" size="small" tabIndex={-1} aria-hidden="true" color="primary" sx={{ mt: 0.5 }}>
                <ChevronRightRounded fontSize="small" />
            </IconButton>
        </CardActionArea>
    )
}

// Column count on wide screens follows the number of columns (max 5).
const XL_COLS = { 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5" }

// stacked: one item per row at every width (e.g. in a narrow side column).
const UpNextPanel = ({ title = "Up next", columns = [], stacked = false, className = "" }) => (
    <Card elevation={1} className={className} sx={{ borderRadius: "0.5rem", transition: "box-shadow 0.2s ease", "&:hover": { boxShadow: 4 } }}>
        <div className="px-4 pt-3 text-[0.8em] font-semibold text-gray-500">{title}</div>
        {/* 1px gaps over a grey background draw the borders between items. */}
        <div className={stacked
            ? "mt-2 grid grid-cols-1 gap-px bg-gray-200 border-t border-gray-200"
            : `mt-2 grid grid-cols-1 ${columns.length > 1 ? "sm:grid-cols-2" : ""} ${XL_COLS[Math.min(columns.length, 5)] ?? ""} gap-px bg-gray-200 border-t border-gray-200 sm:[&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1`}>
            {columns.map((col) => <UpNextColumn key={col.key} col={col} />)}
        </div>
    </Card>
)

export default UpNextPanel
