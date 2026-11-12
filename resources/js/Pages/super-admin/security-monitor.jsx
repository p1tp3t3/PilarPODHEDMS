import { useMemo, useState } from "react"
import { Head } from "@inertiajs/react"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import UpModal from "@/Components/modal/up-modal"
import DropdownField from "@/Components/input/dropdown"
import { DataGrid } from "@/Components/other/data-grid"
import { openPdfTab, toTitleCase } from "@/others/function"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import ReportFilterModal from "@/Components/modal/submission-form/report-filter-modal"
import { Box } from "@mui/material"
import { ShieldAlert, ShieldX, Globe, Clock, Printer, SlidersHorizontal, X } from "lucide-react"

const SEVERITY_STYLE = {
    high: "bg-red-600",
    medium: "bg-orange-500",
    low: "bg-gray-500",
}

const SeverityPill = ({ value }) => (
    <span className={`inline-block px-2 py-1 text-white rounded-xl leading-none whitespace-nowrap ${SEVERITY_STYLE[value] ?? "bg-gray-500"}`}>
        {toTitleCase(value ?? "low")}
    </span>
)

const SEVERITIES = [
    { val: "high", label: "High" },
    { val: "medium", label: "Medium" },
    { val: "low", label: "Low" },
]

const SEMESTERS = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]

const EMPTY_FILTER = { type: "all", severity: "all", filter_by: "date", date_from: "", date_to: "", school_year_id: "", semester: "" }
const EMPTY_GRID_FILTER = { items: [], quickFilterValues: [] }

const fmtDate = (d) => new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

const filterChips = (f, types, schoolYears) => {
    const chips = []
    if (f.type !== "all") chips.push(types.find((t) => t.val === f.type)?.label ?? f.type)
    if (f.severity !== "all") chips.push(`${toTitleCase(f.severity)} Severity`)
    if (f.filter_by === "date") {
        if (f.date_from && f.date_to) chips.push(`${fmtDate(f.date_from)} – ${fmtDate(f.date_to)}`)
        else if (f.date_from) chips.push(`From ${fmtDate(f.date_from)}`)
        else if (f.date_to) chips.push(`Until ${fmtDate(f.date_to)}`)
    } else if ((f.school_year_id && f.school_year_id !== "all") || f.semester) {
        const one = f.school_year_id && f.school_year_id !== "all"
        const year = one ? `SY ${schoolYears.find((y) => String(y.id) === String(f.school_year_id))?.year ?? ""}` : "All School Years"
        const sem = SEMESTERS.find((s) => String(s.val) === String(f.semester))?.label ?? "All Semesters"
        chips.push(`${year} · ${sem}`)
    }
    return chips
}

const fmtDateTime = (s) => {
    const d = new Date(String(s).replace(" ", "T"))
    return isNaN(d) ? s : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })
}

const applyFilters = (entries, f, schoolYears) => {
    let ranges = null
    const oneYear = f.school_year_id && f.school_year_id !== "all"
    if (f.filter_by === "school_year" && (oneYear || f.semester)) {
        const years = oneYear ? schoolYears.filter((y) => String(y.id) === String(f.school_year_id)) : schoolYears
        ranges = years.flatMap((y) => y.semesters ?? []).filter((s) => s.date_start && s.date_end && (!f.semester || String(s.semester) === String(f.semester)))
    }
    return entries.filter((e) => {
        if (f.type !== "all" && e.type !== f.type) return false
        if (f.severity !== "all" && e.severity !== f.severity) return false
        const day = String(e.datetime).slice(0, 10)
        if (f.filter_by === "date") {
            if (f.date_from && day < f.date_from) return false
            if (f.date_to && day > f.date_to) return false
        } else if (ranges && !ranges.some((s) => day >= s.date_start && day <= s.date_end)) {
            return false
        }
        return true
    })
}

const Detail = ({ label, children }) => (
    <div className="grid gap-0.5 min-w-0">
        <div className="text-[0.75em] uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-[0.9em] break-words">{children || <span className="text-gray-400">—</span>}</div>
    </div>
)

const EntryModal = ({ entry, close }) => (
    <UpModal close={!!entry} closeModal={close} isEnableOuterClose={true} cntr={true} pd={["px-6", "py-6"]} w="w-[40rem] max-w-[calc(100vw-2rem)]">
        {entry && (
            <div className="grid gap-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1 min-w-0">
                        <h1 className="text-[1.15em] font-bold">{entry.type_label}</h1>
                        <div className="text-[0.85em] text-gray-500">{fmtDateTime(entry.datetime)}</div>
                    </div>
                    <div className="pr-6">
                        <SeverityPill value={entry.severity} />
                    </div>
                </div>
                <Detail label="Description">{entry.message}</Detail>
                <div className="grid sm:grid-cols-2 gap-4">
                    <Detail label="IP Address">{entry.ip}</Detail>
                    <Detail label="User">{entry.username ? `${entry.username} (${toTitleCase((entry.role ?? "").replaceAll("_", " "))})` : "Guest (not signed in)"}</Detail>
                </div>
                <Detail label="Request">{entry.method} {entry.url}</Detail>
                <Detail label="Browser / User Agent">{entry.user_agent}</Detail>
                {entry.details && (
                    <Detail label="Details">
                        <pre className="mt-1 p-3 rounded bg-gray-50 border border-gray-200 text-[0.8em] whitespace-pre-wrap break-all max-h-60 overflow-auto">
                            {JSON.stringify(entry.details, null, 2)}
                        </pre>
                    </Detail>
                )}
            </div>
        )}
    </UpModal>
)

const SecurityMonitor = ({ entries = [], types = [], school_years = [] }) => {
    const [filter, setFilter] = useState(EMPTY_FILTER)
    const [filterModal, openFilterModal] = useState(false)
    const [viewing, setViewing] = useState(null)
    const [gridFilter, setGridFilter] = useState(EMPTY_GRID_FILTER)
    const search = (gridFilter.quickFilterValues ?? []).join(" ").trim()

    const shown = useMemo(() => applyFilters(entries, filter, school_years), [entries, filter, school_years])
    const chips = filterChips(filter, types, school_years)

    const stats = useMemo(() => {
        const dayAgo = Date.now() - 24 * 3600 * 1000
        return {
            total: entries.length,
            today: entries.filter((e) => new Date(String(e.datetime).replace(" ", "T")).getTime() >= dayAgo).length,
            high: entries.filter((e) => e.severity === "high").length,
            ips: new Set(entries.map((e) => e.ip).filter(Boolean)).size,
        }
    }, [entries])

    const isFiltered = chips.length > 0

    const printPdf = () => {
        const f = filter.filter_by === "date"
            ? { ...filter, school_year_id: "", semester: "" }
            : { ...filter, date_from: "", date_to: "" }
        const params = Object.entries(f).filter(([, v]) => v !== "" && v !== "all" && v != null)
        if (search) params.push(["search", search])
        const q = new URLSearchParams(params).toString()
        openPdfTab(`/super-admin/security-monitor/pdf${q ? `?${q}` : ""}`, "security log report")
    }

    const columns = [
        { field: "datetime", headerName: "Date / Time", width: 190, renderCell: (p) => fmtDateTime(p.value) },
        { field: "severity", headerName: "Severity", width: 110, renderCell: (p) => <SeverityPill value={p.value} /> },
        { field: "type_label", headerName: "Type", width: 160 },
        { field: "message", headerName: "Description", flex: 1, minWidth: 260 },
        { field: "ip", headerName: "IP Address", width: 140 },
        {
            field: "username", headerName: "User", width: 170,
            valueGetter: (v) => v ?? "Guest",
            renderCell: (p) => p.row.username
                ? <div className="leading-tight"><div>{p.row.username}</div><div className="text-[0.85em] text-gray-500">{toTitleCase((p.row.role ?? "").replaceAll("_", " "))}</div></div>
                : <span className="text-gray-500">Guest</span>,
        },
    ]

    return (
        <>
            <Head title="Security Monitor" />
            <EntryModal entry={viewing} close={() => setViewing(null)} />
            <PageLayout title="SECURITY MONITOR">
                <div className="grid gap-5 min-w-0">
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <QuantityCard label="Total Attempts" num={stats.total} icon={ShieldAlert} />
                        <QuantityCard label="Last 24 Hours" num={stats.today} icon={Clock} />
                        <QuantityCard label="High Severity" num={stats.high} icon={ShieldX} />
                        <QuantityCard label="Unique IP Addresses" num={stats.ips} icon={Globe} />
                    </div>

                    <ReportFilterModal
                        close={filterModal}
                        closeModal={openFilterModal}
                        value={filter}
                        schoolYears={school_years}
                        emptyValue={EMPTY_FILTER}
                        canApply={() => true}
                        schoolYearLabel="All School Years"
                        extraFields={(draft, setDraft) => (
                            <div className="grid sm:grid-cols-2 gap-3">
                                <DropdownField
                                    default={{ val: "all", label: "All Types" }}
                                    list={types}
                                    val={draft.type}
                                    onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}
                                    name="security_type"
                                    keepCase={true}
                                />
                                <DropdownField
                                    default={{ val: "all", label: "All Severities" }}
                                    list={SEVERITIES}
                                    val={draft.severity}
                                    onChange={(e) => setDraft((p) => ({ ...p, severity: e.target.value }))}
                                    name="security_severity"
                                    keepCase={true}
                                />
                            </div>
                        )}
                        onApply={setFilter}
                        onClear={() => setFilter(EMPTY_FILTER)}
                    />

                    <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-5 min-w-0">
                        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
                            {chips.map((c) => (
                                <span key={c} className="max-w-full truncate px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
                                    {c}
                                </span>
                            ))}
                            {isFiltered && (
                                <button
                                    type="button"
                                    onClick={() => setFilter(EMPTY_FILTER)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.85em] text-gray-600 hover:bg-gray-100"
                                >
                                    <X size={13} /> Clear
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => openFilterModal(true)}
                                className={`flex items-center gap-2 px-4 py-2 text-[0.9em] rounded border transition-colors ${
                                    isFiltered
                                        ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <SlidersHorizontal size={16} /> Filter
                            </button>
                            <button type="button" onClick={printPdf} className="flex items-center gap-2 px-4 py-2 rounded border border-blue-600 bg-blue-600 text-white text-[0.9em] font-semibold hover:bg-blue-700">
                                <Printer size={14} /> Print PDF
                            </button>
                        </div>
                    </div>

                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", backgroundColor: "var(--dm-surface, #fff)", borderRadius: 2, boxShadow: 1, p: 2 }}>
                        <DataGrid
                            rows={shown}
                            columns={columns}
                            showToolbar
                            filterModel={gridFilter}
                            onFilterModelChange={setGridFilter}
                            getRowId={(r) => `${r.id}-${r.datetime}`}
                            onRowClick={(p) => setViewing(p.row)}
                            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
                            pageSizeOptions={[20, 50, 100]}
                            disableRowSelectionOnClick
                            getRowHeight={() => "auto"}
                            localeText={{ noRowsLabel: isFiltered ? "No security events match these filters" : "No security events recorded" }}
                            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" }, "& .MuiDataGrid-cell": { py: 1 } }}
                        />
                    </Box>
                </div>
            </PageLayout>
        </>
    )
}

SecurityMonitor.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SecurityMonitor
