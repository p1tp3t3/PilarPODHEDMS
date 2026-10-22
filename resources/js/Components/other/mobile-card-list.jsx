import { useMemo, useState, useEffect, isValidElement } from "react"
import { Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import ProfilePic from "@/Components/other/profile-pic"
import { getProfilePic } from "@/others/function"

// Phone rendering of a DataGrid: the same `rows`/`columns` definitions, laid
// out as one card per row instead of a horizontally-scrolling table. The
// first data column becomes the card's heading, the rest become labelled
// lines, and any actions column becomes a button row at the bottom.
//
// User lists pass `mobileSummary(row) => { name, role, picture, sex, hide }`
// instead: each row collapses to picture + full name + role, and tapping it
// drops down the details (minus the `hide` fields) and actions. `select`
// (optional node, e.g. a checkbox) sits on the collapsed row itself. Non-user
// lists pass `avatar` (an icon node) in place of the picture, or
// `avatar: false` for none.

// Collapsed-row avatar for records (complaints, referrals, forms...) rather
// than people: the record's icon, tinted by its status.
const STATUS_TONE = {
    pending: "bg-amber-100 text-amber-700",
    ongoing: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    confirmed: "bg-green-100 text-green-700",
    resolved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    revoked: "bg-red-100 text-red-700",
}
export const StatusAvatar = ({ icon: Icon, status }) => (
    <div className={`h-9 w-9 grid place-items-center rounded-full ${STATUS_TONE[String(status ?? "").toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}>
        <Icon size={18} />
    </div>
)

// "Pending", "Approved"... for the collapsed row's second line.
export const statusLabel = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : "")

const isIndexColumn = (c) => c.headerName === "#" || ["i", "index", "#"].includes(c.field)
const isActionsColumn = (c) => c.type === "actions" || c.field === "actions"

const toText = (v) => {
    if (v === null || v === undefined || v === "") return null
    if (v instanceof Date) return v.toLocaleDateString()
    if (typeof v === "boolean") return v ? "Yes" : "No"
    if (typeof v === "object" && !isValidElement(v)) return null
    return v
}

const MobileCardList = ({
    rows = [],
    columns = [],
    getRowId,
    loading,
    localeText,
    slots,
    initialState,
    paginationMode,
    rowCount,
    paginationModel,
    onPaginationModelChange,
    showToolbar,
    onRowClick,
    hideFooter,
    mobileSummary,
}) => {
    const rowsSafe = rows ?? []
    const idOf = (row, i) => (getRowId ? getRowId(row) : row.id ?? i)
    const isServer = paginationMode === "server"
    const defaultPageSize = initialState?.pagination?.paginationModel?.pageSize ?? 10

    const [search, setSearch] = useState("")
    const [page, setPage] = useState(0)
    const [openId, setOpenId] = useState(null)

    useEffect(() => setPage(0), [search, rowsSafe.length])

    const visibleColumns = columns.filter((c) => !isIndexColumn(c) && !c.hide)
    const actionColumns = visibleColumns.filter(isActionsColumn)
    const dataColumns = visibleColumns.filter((c) => !isActionsColumn(c))
    const [titleColumn, ...detailColumns] = dataColumns

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q || isServer) return rowsSafe
        return rowsSafe.filter((row) => {
            try {
                return JSON.stringify(row).toLowerCase().includes(q)
            } catch {
                return true
            }
        })
    }, [rowsSafe, search, isServer])

    const usePaging = !hideFooter || isServer
    const pageSize = isServer ? paginationModel?.pageSize ?? defaultPageSize : defaultPageSize
    const currentPage = isServer ? paginationModel?.page ?? 0 : page
    const total = isServer ? rowCount ?? rowsSafe.length : filtered.length
    const pageCount = usePaging ? Math.max(1, Math.ceil(total / pageSize)) : 1
    const shown = !usePaging || isServer ? filtered : filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize)

    const indexById = useMemo(() => {
        const m = new Map()
        filtered.forEach((row, i) => m.set(idOf(row, i), i))
        return m
    }, [filtered])
    const api = { getRowIndexRelativeToVisibleRows: (id) => indexById.get(id) ?? 0 }

    const goTo = (p) => {
        if (p < 0 || p >= pageCount) return
        if (isServer) onPaginationModelChange?.({ page: p, pageSize })
        else setPage(p)
    }

    const cell = (col, row, id) => {
        let value = row[col.field]
        if (col.valueGetter) value = col.valueGetter(value, row, col, api)
        const params = { row, id, value, field: col.field, colDef: col, api, formattedValue: value, hasFocus: false, tabIndex: -1 }
        if (col.renderCell) return col.renderCell(params)
        if (col.getActions) return col.getActions(params)
        const formatted = col.valueFormatter ? col.valueFormatter(value, row, col, api) : value
        return toText(formatted)
    }

    const isEmpty = (node) => node === null || node === undefined || node === false || node === "" || (Array.isArray(node) && node.length === 0)

    const NoRows = slots?.noRowsOverlay
    return (
        <div className="w-full h-full min-w-0 flex flex-col gap-3 overflow-y-auto">
            {showToolbar && !isServer && (
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 py-2 text-[0.85em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}

            {loading ? (
                <div className="grid gap-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-24 rounded-xl bg-gray-200/70 animate-pulse" />
                    ))}
                </div>
            ) : shown.length === 0 ? (
                NoRows ? <div className="py-6"><NoRows /></div> : (
                    <div className="py-8 text-center text-[0.85em] text-gray-500">
                        {localeText?.noRowsLabel ?? "No records found"}
                    </div>
                )
            ) : (
                <div className="grid gap-3">
                    {shown.map((row, i) => {
                        const id = idOf(row, i)
                        const actions = actionColumns.map((c) => cell(c, row, id)).filter((n) => !isEmpty(n))
                        if (mobileSummary) {
                            const sum = mobileSummary(row)
                            const open = openId === id
                            const hidden = sum.hide ?? []
                            return (
                                <div key={id} className="rounded-xl border border-gray-200 bg-white shadow-sm text-[0.85em] overflow-hidden">
                                    <div className="flex items-center">
                                    {sum.select && (
                                        <label className="shrink-0 pl-3 py-2.5 grid place-items-center">{sum.select}</label>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(open ? null : id)}
                                        className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left active:bg-gray-50"
                                    >
                                        {sum.avatar !== false && (
                                            <div className="shrink-0">
                                                {sum.avatar ?? <ProfilePic size={2.25} src={getProfilePic(sum.picture, sum.sex)} />}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-gray-900 truncate">{sum.name || "—"}</div>
                                            {sum.role && <div className="text-[0.85em] text-gray-500 truncate">{sum.role}</div>}
                                        </div>
                                        <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                                    </button>
                                    </div>
                                    {open && (
                                        <div className="px-4 pb-4 pt-3 border-t border-gray-100 grid gap-3">
                                            <dl className="grid gap-2">
                                                {dataColumns.filter((c) => !hidden.includes(c.field)).map((col) => {
                                                    const content = cell(col, row, id)
                                                    if (isEmpty(content)) return null
                                                    return (
                                                        <div key={col.field} className="flex gap-3 items-start">
                                                            <dt className="w-[6.5rem] shrink-0 text-[0.85em] text-gray-500 pt-0.5">
                                                                {col.headerName || col.field}
                                                            </dt>
                                                            <dd className="flex-1 min-w-0 break-words text-gray-800">{content}</dd>
                                                        </div>
                                                    )
                                                })}
                                            </dl>
                                            {actions.length > 0 && (
                                                <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                                    {actions.map((a, k) => <div key={k} className="contents">{a}</div>)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        }
                        const title = titleColumn ? cell(titleColumn, row, id) : null
                        return (
                            <div
                                key={id}
                                onClick={onRowClick ? () => onRowClick({ row, id }) : undefined}
                                className={`rounded-xl border border-gray-200 bg-white shadow-sm p-4 grid gap-3 text-[0.85em] ${onRowClick ? "cursor-pointer active:bg-gray-50" : ""}`}
                            >
                                {!isEmpty(title) && (
                                    <div className="font-semibold text-gray-900 min-w-0 break-words">{title}</div>
                                )}
                                {detailColumns.length > 0 && (
                                    <dl className="grid gap-2">
                                        {detailColumns.map((col) => {
                                            const content = cell(col, row, id)
                                            if (isEmpty(content)) return null
                                            return (
                                                <div key={col.field} className="flex gap-3 items-start">
                                                    <dt className="w-[6.5rem] shrink-0 text-[0.85em] text-gray-500 pt-0.5">
                                                        {col.headerName || col.field}
                                                    </dt>
                                                    <dd className="flex-1 min-w-0 break-words text-gray-800">{content}</dd>
                                                </div>
                                            )
                                        })}
                                    </dl>
                                )}
                                {actions.length > 0 && (
                                    <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                        {actions.map((a, k) => <div key={k} className="contents">{a}</div>)}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {usePaging && pageCount > 1 && (
                <div className="flex items-center justify-between gap-2 text-[0.85em] pb-1">
                    <button
                        type="button"
                        onClick={() => goTo(currentPage - 1)}
                        disabled={currentPage === 0}
                        className="flex items-center gap-1 px-3 py-2 rounded-full border border-gray-300 bg-white disabled:opacity-40"
                    >
                        <ChevronLeft size={15} /> Prev
                    </button>
                    <span className="text-gray-600">Page {currentPage + 1} of {pageCount}</span>
                    <button
                        type="button"
                        onClick={() => goTo(currentPage + 1)}
                        disabled={currentPage >= pageCount - 1}
                        className="flex items-center gap-1 px-3 py-2 rounded-full border border-gray-300 bg-white disabled:opacity-40"
                    >
                        Next <ChevronRight size={15} />
                    </button>
                </div>
            )}
        </div>
    )
}

export default MobileCardList
