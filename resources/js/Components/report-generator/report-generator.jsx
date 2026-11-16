import { useEffect, useMemo, useState } from "react"
import { usePage } from "@inertiajs/react"
import { Box, Button, Chip, IconButton, LinearProgress, Tooltip } from "@mui/material"
import { CloseRounded } from "@mui/icons-material"
import { Plus, Play, Pencil, Eye, Download } from "lucide-react"
import ActionBtn from "@/Components/button/action-btn"
import DropdownField from "@/Components/input/dropdown"
import TabSwitcher from "@/Components/other/tab-switcher"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import { DataGrid } from "@/Components/other/data-grid"
import { useReload } from "@/context-provider/reload-provider"
import { showOutputModal, showWarningModal } from "@/others/function"

/**
 * The Report Generator, shared by the prefect and the super admin: saved
 * report filters (Report Filters tab), each generated as a PDF or Excel file
 * in the background with its progress on the row, and the files made
 * (Generated Reports tab). Each role passes its own data, labels, actions
 * and New / Edit form:
 *
 *   tab, onTabChange             "filters" | "generated" (the page keeps the URL)
 *   filters                      [{ id, name, report_type, type_label, summary, created,
 *                                   individual, school_year, semester }] or null (loading)
 *   generated                    [{ id, name, file_name?, report_type, type_label, file_type,
 *                                   summary?, created, view_url, download_url,
 *                                   individual, school_year, semester }] or null
 *   typeOptions                  [{ val, label }] (the Report Type dropdown)
 *   schoolYears                  ["2025-2026", ...]
 *   canExcel(filter)             false: PDF only (e.g. the Analytical Report)
 *   generate(id, fileType)       queues the file (Promise); progress arrives on the
 *                                user's channel as ReportGenerated, track id "filter-<id>"
 *   deleteFilter(id), deleteReport(id)   Promises
 *   onNew(), onEdit(filter)      open the role's filter form
 *   onChanged()                  refetch the lists
 */

const SEMESTERS = [{ val: "1", label: "1st Semester" }, { val: "2", label: "2nd Semester" }]

// A filter row's generation: a bar from 0% to 100%, then View / Download.
const JobCell = ({ job, onDismiss }) => {
    if (job.status === "ready") {
        return (
            <div className="flex items-center gap-1 w-full">
                <span className="text-[0.8em] text-green-700 font-semibold mr-1">Ready</span>
                {job.view_url && <Tooltip title="View"><IconButton size="small" component="a" href={job.view_url} target="_blank" rel="noreferrer"><Eye size={16} /></IconButton></Tooltip>}
                <Tooltip title="Download"><IconButton size="small" component="a" href={job.download_url} sx={{ color: "#2563eb" }}><Download size={16} /></IconButton></Tooltip>
                <IconButton size="small" onClick={onDismiss} aria-label="Dismiss"><CloseRounded fontSize="inherit" /></IconButton>
            </div>
        )
    }
    if (job.status === "failed") {
        // "Nothing matched" is a notice (amber); anything else an error (red).
        const empty = job.reason === "empty"
        return (
            <div className="flex items-center gap-1 w-full py-1">
                <span className={`text-[0.78em] leading-tight ${empty ? "text-amber-700" : "text-red-600"}`}>
                    {empty && <b className="block">No records</b>}
                    {job.message || "Failed to generate the report."}
                </span>
                <IconButton size="small" onClick={onDismiss} aria-label="Dismiss"><CloseRounded fontSize="inherit" /></IconButton>
            </div>
        )
    }
    return (
        <div className="grid gap-1 w-full py-1">
            <div className="flex justify-between text-[0.75em] text-gray-600"><span>{job.stage ?? "Queued"}</span><span>{job.percent ?? 0}%</span></div>
            <LinearProgress variant="determinate" value={job.percent ?? 0} sx={{ height: 6, borderRadius: 3 }} />
        </div>
    )
}

const ReportGenerator = ({
    tab, onTabChange, filters, generated, typeOptions = [], schoolYears = [],
    canExcel = () => true, generate, deleteFilter, deleteReport, onNew, onEdit, onChanged,
}) => {
    const { loadRegister } = useReload()

    // The tables' dropdown filters (in the browser).
    const [narrow, setNarrow] = useState({ type: "all", scope: "all", file_type: "all", school_year: "all", semester: "all" })
    const setNarrowBy = (key) => (e) => setNarrow((n) => ({ ...n, [key]: e.target.value }))
    const matches = (r) =>
        (narrow.type === "all" || r.report_type === narrow.type) &&
        (narrow.school_year === "all" || r.school_year === narrow.school_year) &&
        (narrow.semester === "all" || String(r.semester ?? "") === narrow.semester)
    const filterRows = (filters ?? []).filter((f) => matches(f) && (narrow.scope === "all" || (narrow.scope === "individual") === !!f.individual))
    const generatedRows = (generated ?? []).filter((r) => matches(r) && (narrow.file_type === "all" || r.file_type === narrow.file_type))

    // Generation progress per filter ("filter-<id>"), from the job's broadcasts.
    const userId = usePage().props.auth?.user?.id
    const [jobs, setJobs] = useState({})
    useEffect(() => {
        if (!userId || !window.Echo) return
        const channel = window.Echo.private(`job-status.progress.user.${userId}`)
        const onStatus = (e) => {
            if (!String(e.track_id ?? "").startsWith("filter-")) return
            setJobs((prev) => {
                const current = prev[e.track_id] ?? {}
                // Never go backwards (a late "progress" after "ready").
                if (current.status === "ready" || current.status === "failed") return prev
                return { ...prev, [e.track_id]: { ...current, ...e, percent: Math.max(current.percent ?? 0, e.percent ?? 0) } }
            })
            // A finished file appears in Generated Reports.
            if (e.status === "ready") onChanged?.()
        }
        channel.listen(".ReportGenerated", onStatus)
        return () => channel.stopListening(".ReportGenerated", onStatus)
    }, [userId])

    const startGenerate = (row, fileType) => {
        const key = `filter-${row.id}`
        setJobs((prev) => ({ ...prev, [key]: { status: "queued", percent: 0, stage: `Queued (${fileType === "excel" ? "Excel" : "PDF"})` } }))
        generate(row.id, fileType)
            .then(() => setJobs((prev) => ({ ...prev, [key]: { ...prev[key], stage: "Waiting for the report service" } })))
            .catch(() => setJobs((prev) => ({ ...prev, [key]: { status: "failed", message: "Failed to queue the report." } })))
    }
    const dismiss = (key) => setJobs((prev) => { const next = { ...prev }; delete next[key]; return next })

    // Delete (a filter / a generated file), with the app's confirm and result modals.
    const confirmDelete = (text, wait, done, failed, action) => {
        showWarningModal(text, "Delete", "Cancel", () => {
            loadRegister(true, "text-wait", wait)
            action()
                .then(() => { loadRegister(true, ""); showOutputModal(done, "s", () => { loadRegister(false); onChanged?.() }) })
                .catch(() => { loadRegister(true, ""); showOutputModal(failed, "e", () => loadRegister(false)) })
        })
    }

    const anyJob = Object.keys(jobs).length > 0
    const filterColumns = useMemo(() => [
        { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
        { field: "type_label", headerName: "Report", width: 170, renderCell: ({ value }) => <Chip size="small" label={value} variant="outlined" /> },
        { field: "summary", headerName: "Filter", flex: 1.2, minWidth: 220, renderCell: ({ value }) => <span className="whitespace-normal leading-snug py-2 block">{value}</span> },
        { field: "created", headerName: "Created", width: 190 },
        ...(anyJob ? [{
            field: "progress", headerName: "Progress", width: 230, sortable: false, filterable: false,
            renderCell: ({ row }) => jobs[`filter-${row.id}`] ? <JobCell job={jobs[`filter-${row.id}`]} onDismiss={() => dismiss(`filter-${row.id}`)} /> : null,
        }] : []),
        {
            field: "actions", headerName: "Action", width: 340, sortable: false, filterable: false,
            renderCell: ({ row }) => {
                const job = jobs[`filter-${row.id}`]
                const busy = job && job.status !== "ready" && job.status !== "failed"
                return (
                    <div className="flex items-center gap-2 h-full">
                        <ActionBtn className="bg-red-600 hover:bg-red-700" onClick={() => !busy && startGenerate(row, "pdf")} title="Generate PDF" disabled={busy}>
                            <span className="inline-flex items-center gap-1"><Play size={13} /> PDF</span>
                        </ActionBtn>
                        {canExcel(row) &&
                        <ActionBtn className="bg-green-600 hover:bg-green-700" onClick={() => !busy && startGenerate(row, "excel")} title="Generate Excel" disabled={busy}>
                            <span className="inline-flex items-center gap-1"><Play size={13} /> Excel</span>
                        </ActionBtn>}
                        <ActionBtn className="bg-blue-600 hover:bg-blue-700" onClick={() => onEdit(row)} title="Edit"><Pencil size={14} /></ActionBtn>
                        <ActionBtn className="bg-red-600 hover:bg-red-700" title="Delete"
                            onClick={() => confirmDelete(`Delete the filter "${row.name}"?`, "Deleting Filter", "Filter Deleted", "Failed to Delete the Filter", () => deleteFilter(row.id))}>
                            Delete
                        </ActionBtn>
                    </div>
                )
            },
        },
    ], [jobs, anyJob])

    const reportColumns = [
        { field: "name", headerName: "Report", flex: 1, minWidth: 200 },
        { field: "type_label", headerName: "Type", width: 150, renderCell: ({ value }) => <Chip size="small" label={value} variant="outlined" /> },
        { field: "file_type", headerName: "File", width: 90, renderCell: ({ value }) => <Chip size="small" label={value === "excel" ? "EXCEL" : "PDF"} variant="outlined" color={value === "excel" ? "success" : "error"} /> },
        { field: "summary", headerName: "Filters Used", flex: 1.3, minWidth: 220, renderCell: ({ row }) => <span className="whitespace-normal leading-snug py-2 block">{row.summary ?? row.file_name}</span> },
        { field: "created", headerName: "Generated", width: 190 },
        {
            field: "actions", headerName: "Action", width: 160, sortable: false, filterable: false,
            renderCell: ({ row }) => (
                <div className="flex items-center gap-1 h-full">
                    {row.view_url && <Tooltip title="View"><IconButton size="small" component="a" href={row.view_url} target="_blank" rel="noreferrer"><Eye size={17} /></IconButton></Tooltip>}
                    <Tooltip title="Download"><IconButton size="small" component="a" href={row.download_url} sx={{ color: "#2563eb" }}><Download size={17} /></IconButton></Tooltip>
                    <ActionBtn className="bg-red-600 hover:bg-red-700"
                        onClick={() => confirmDelete(`Delete "${row.name}"? The file is removed too.`, "Deleting Report", "Report Deleted", "Failed to Delete the Report", () => deleteReport(row.id))}>
                        Delete
                    </ActionBtn>
                </div>
            ),
        },
    ]

    const grid = { disableRowSelectionOnClick: true, showToolbar: true, pagination: true, pageSizeOptions: [10, 20, 50], initialState: { pagination: { paginationModel: { page: 0, pageSize: 20 } } }, getRowHeight: () => "auto" }

    return (
        <div className="grid gap-4 min-w-0">
            <TabSwitcher tabs={[{ key: "filters", label: "Report Filters" }, { key: "generated", label: "Generated Reports" }]} value={tab} onChange={onTabChange} />

            {/* Below the tabs: the table's dropdown filters, and New Filter (Report Filters tab). */}
            <div className="flex flex-wrap items-center gap-3 min-w-0">
                <MobileFilters active={countActive(narrow.type, tab === "filters" ? narrow.scope : narrow.file_type, narrow.school_year, narrow.semester)}>
                    <div className="flex flex-wrap gap-3">
                        <div className="w-full sm:w-60">
                            <DropdownField default={{ val: "all", label: "All Report Types" }} list={typeOptions} val={narrow.type} onChange={setNarrowBy("type")} name="narrow_type" keepCase />
                        </div>
                        {tab === "filters" ? (
                            <div className="w-full sm:w-48">
                                <DropdownField default={{ val: "all", label: "All Scopes" }} list={[{ val: "group", label: "Group" }, { val: "individual", label: "Individual" }]} val={narrow.scope} onChange={setNarrowBy("scope")} name="narrow_scope" keepCase />
                            </div>
                        ) : (
                            <div className="w-full sm:w-48">
                                <DropdownField default={{ val: "all", label: "All File Types" }} list={[{ val: "pdf", label: "PDF" }, { val: "excel", label: "Excel" }]} val={narrow.file_type} onChange={setNarrowBy("file_type")} name="narrow_file_type" keepCase />
                            </div>
                        )}
                        <div className="w-full sm:w-52">
                            <DropdownField default={{ val: "all", label: "All School Years" }} list={schoolYears.map((y) => ({ val: y, label: y }))} val={narrow.school_year} onChange={setNarrowBy("school_year")} name="narrow_school_year" keepCase />
                        </div>
                        <div className="w-full sm:w-48">
                            <DropdownField default={{ val: "all", label: "All Semesters" }} list={SEMESTERS} val={narrow.semester} onChange={setNarrowBy("semester")} name="narrow_semester" keepCase />
                        </div>
                    </div>
                </MobileFilters>
                {tab === "filters" && (
                    <Button variant="contained" disableElevation onClick={onNew} startIcon={<Plus size={16} />}
                        sx={{ ml: { md: "auto" }, textTransform: "none", fontSize: "0.9em", borderRadius: "0.375rem", px: 2, height: 40, bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" } }}>
                        New Filter
                    </Button>
                )}
            </div>

            <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                {tab === "filters" ? (
                    <DataGrid key="filters" rows={filterRows} loading={filters == null} columns={filterColumns} getRowId={(row) => row.id} {...grid}
                        localeText={{ noRowsLabel: "No report filters yet. Create one with New Filter." }}
                        mobileSummary={(row) => ({ name: row.name, role: `${row.type_label} · ${row.summary}`, hide: ["name"] })} />
                ) : (
                    <DataGrid key="generated" rows={generatedRows} loading={generated == null} columns={reportColumns} getRowId={(row) => row.id} {...grid}
                        localeText={{ noRowsLabel: "No generated reports yet. Generate one from Report Filters." }}
                        mobileSummary={(row) => ({ name: row.name, role: `${row.type_label} · ${row.created}`, hide: ["name"] })} />
                )}
            </Box>
        </div>
    )
}

export default ReportGenerator
