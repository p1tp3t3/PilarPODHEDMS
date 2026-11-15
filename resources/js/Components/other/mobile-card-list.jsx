import { Fragment, useMemo, useState, useEffect, isValidElement } from "react"
import {
    Avatar, Box, Collapse, Divider, InputAdornment, List, ListItem, ListItemAvatar,
    ListItemButton, ListItemText, Pagination, Paper, Skeleton, TextField, Typography,
} from "@mui/material"
import { ExpandMoreRounded, SearchRounded } from "@mui/icons-material"
import { getProfilePic } from "@/others/function"

// Phone rendering of a DataGrid, built from MUI (Paper + List, TextField
// search, Pagination): the same `rows`/`columns` definitions, laid out as
// one list item per row instead of a horizontally-scrolling table. The
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
// than people: the record's icon, tinted by its status (an MUI Avatar).
const STATUS_TONE = {
    pending: ["#fef3c7", "#b45309"],
    ongoing: ["#dbeafe", "#1d4ed8"],
    approved: ["#dcfce7", "#15803d"],
    confirmed: ["#dcfce7", "#15803d"],
    resolved: ["#dcfce7", "#15803d"],
    rejected: ["#fee2e2", "#b91c1c"],
    revoked: ["#fee2e2", "#b91c1c"],
}
export const StatusAvatar = ({ icon: Icon, status }) => {
    const [bg, fg] = STATUS_TONE[String(status ?? "").toLowerCase()] ?? ["#f3f4f6", "#4b5563"]
    return (
        <Avatar sx={{ width: 36, height: 36, bgcolor: bg, color: fg }}>
            <Icon size={18} />
        </Avatar>
    )
}

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

    // Label / value lines of a row's details.
    const details = (cols, row, id) => (
        <Box component="dl" sx={{ display: "grid", gap: 1, m: 0 }}>
            {cols.map((col) => {
                const content = cell(col, row, id)
                if (isEmpty(content)) return null
                return (
                    <Box key={col.field} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                        <Typography component="dt" variant="caption" color="text.secondary" sx={{ width: "6.5rem", flexShrink: 0, pt: 0.25 }}>
                            {col.headerName || col.field}
                        </Typography>
                        <Typography component="dd" variant="body2" sx={{ flex: 1, minWidth: 0, m: 0, overflowWrap: "anywhere" }}>
                            {content}
                        </Typography>
                    </Box>
                )
            })}
        </Box>
    )
    const actionRow = (actions, stop = false) => actions.length > 0 && (
        <Box
            sx={{ pt: 1.5, mt: 1.5, borderTop: 1, borderColor: "divider", display: "flex", flexWrap: "wrap", gap: 1 }}
            onClick={stop ? (e) => e.stopPropagation() : undefined}
        >
            {actions.map((a, k) => <Fragment key={k}>{a}</Fragment>)}
        </Box>
    )

    return (
        <Box sx={{ width: "100%", height: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5, overflowY: "auto" }}>
            {showToolbar && !isServer && (
                <TextField
                    size="small"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    fullWidth
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 999, bgcolor: "background.paper" } }}
                />
            )}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                {loading ? (
                    <List disablePadding>
                        {[0, 1, 2].map((i) => (
                            <Fragment key={i}>
                                {i > 0 && <Divider component="li" />}
                                <ListItem>
                                    <ListItemAvatar><Skeleton variant="circular" width={36} height={36} /></ListItemAvatar>
                                    <ListItemText primary={<Skeleton width="60%" />} secondary={<Skeleton width="40%" />} />
                                </ListItem>
                            </Fragment>
                        ))}
                    </List>
                ) : shown.length === 0 ? (
                    NoRows ? <Box sx={{ py: 3 }}><NoRows /></Box> : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                            {localeText?.noRowsLabel ?? "No records found"}
                        </Typography>
                    )
                ) : (
                    <List disablePadding>
                        {shown.map((row, i) => {
                            const id = idOf(row, i)
                            const actions = actionColumns.map((c) => cell(c, row, id)).filter((n) => !isEmpty(n))

                            if (mobileSummary) {
                                const sum = mobileSummary(row)
                                const open = openId === id
                                const hidden = sum.hide ?? []
                                return (
                                    <Fragment key={id}>
                                        {i > 0 && <Divider component="li" />}
                                        <ListItem disablePadding sx={{ display: "block" }}>
                                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                                {sum.select && (
                                                    <Box component="label" sx={{ pl: 1.5, display: "grid", placeItems: "center" }}>{sum.select}</Box>
                                                )}
                                                <ListItemButton onClick={() => setOpenId(open ? null : id)} selected={open} sx={{ py: 1.25 }}>
                                                    {sum.avatar !== false && (
                                                        <ListItemAvatar sx={{ minWidth: 48 }}>
                                                            {sum.avatar ?? <Avatar src={getProfilePic(sum.picture, sum.sex)} sx={{ width: 36, height: 36 }} />}
                                                        </ListItemAvatar>
                                                    )}
                                                    <ListItemText
                                                        primary={sum.name || "—"}
                                                        secondary={sum.role}
                                                        slotProps={{
                                                            primary: { noWrap: true, fontWeight: 600, fontSize: "0.9rem" },
                                                            secondary: { noWrap: true, fontSize: "0.75rem" },
                                                        }}
                                                    />
                                                    <ExpandMoreRounded sx={{ color: "text.secondary", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
                                                </ListItemButton>
                                            </Box>
                                            <Collapse in={open} timeout="auto" unmountOnExit>
                                                <Box sx={{ px: 2, pt: 1.5, pb: 2, borderTop: 1, borderColor: "divider" }}>
                                                    {details(dataColumns.filter((c) => !hidden.includes(c.field)), row, id)}
                                                    {actionRow(actions)}
                                                </Box>
                                            </Collapse>
                                        </ListItem>
                                    </Fragment>
                                )
                            }

                            const title = titleColumn ? cell(titleColumn, row, id) : null
                            const body = (
                                <Box sx={{ width: "100%", minWidth: 0 }}>
                                    {!isEmpty(title) && (
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: detailColumns.length ? 1 : 0, overflowWrap: "anywhere" }}>
                                            {title}
                                        </Typography>
                                    )}
                                    {detailColumns.length > 0 && details(detailColumns, row, id)}
                                    {actionRow(actions, !!onRowClick)}
                                </Box>
                            )
                            return (
                                <Fragment key={id}>
                                    {i > 0 && <Divider component="li" />}
                                    {onRowClick ? (
                                        <ListItemButton onClick={() => onRowClick({ row, id })} sx={{ py: 1.5, alignItems: "flex-start" }}>{body}</ListItemButton>
                                    ) : (
                                        <ListItem sx={{ py: 1.5 }}>{body}</ListItem>
                                    )}
                                </Fragment>
                            )
                        })}
                    </List>
                )}
            </Paper>

            {usePaging && pageCount > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", pb: 0.5 }}>
                    <Pagination
                        size="small"
                        color="primary"
                        count={pageCount}
                        page={currentPage + 1}
                        onChange={(_, p) => goTo(p - 1)}
                        siblingCount={0}
                    />
                </Box>
            )}
        </Box>
    )
}

export default MobileCardList
