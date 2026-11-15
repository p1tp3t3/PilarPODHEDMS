import { useEffect, useMemo, useState } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { Chip, IconButton, LinearProgress, Tooltip } from "@mui/material"
import { CloseRounded } from "@mui/icons-material"
import { readableDate, readableTime, toTitleCase, showWarningModal, showOutputModal , showLoadingModal , closeLoadingModal } from "@/others/function"
import ActionBtn from "../button/action-btn"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { Play, Pencil, Trash2, Eye, Download } from "lucide-react"
import { usePage } from "@inertiajs/react"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"

// The Saved Filters page's dropdowns (same as Generated Reports, minus the
// file type, which is chosen per generation).
const TYPE_OPTIONS = [
    { val: "incident", label: "Incident Report" },
    { val: "violation", label: "Violation Report" },
    { val: "tardy", label: "Tardy Report" },
    { val: "appointment", label: "Appointment Report" },
    { val: "gatepass", label: "Gate Pass Report" },
    { val: "analytics", label: "Analytical Report" },
]
const isIndividual = (f) => ["1", "true", true, 1].includes(f?.individual) && !!f?.student_id

const summarizeFilters = (filters) => {
    const parts = []

    if (filters.school_year) {
        const sem = { 1: "1st Semester", 2: "2nd Semester" }[filters.semester]
        parts.push(filters.school_year === "all" ? "All School Years" : `SY ${filters.school_year}${sem ? ` (${sem})` : ""}`)
    } else if (filters.date_from && filters.date_to) {
        parts.push(`${filters.date_from} to ${filters.date_to}`)
    } else {
        parts.push("All Time")
    }

    if (filters.individual) {
        parts.push("Individual Student")
    } else if (filters.program && filters.program !== "all") {
        parts.push("Specific Program")
    } else {
        parts.push("All Programs")
    }

    return parts.join(" • ")
}

// Every saved filter can be re-run (Generate), tweaked (Edit, reopens the
// same form pre-filled), or removed (Delete) — replacing the old flow
// where the filter form always produced a file immediately and was thrown
// away right after. `generateOnly` (a report page's Generate Report tab)
// shows just a labelled Generate button; editing stays on Saved Filters.
const ReportFilterList = ({ list = null, onEdit, onChange, showType = true, generateOnly = false, emptyLabel = "No report filters yet. Create one with New Filter.", showFilters = false, schoolYears = [] }) => {
    const [narrow, setNarrow] = useState({ type: "", scope: "", school_year: "", semester: "" })
    const setNarrowBy = (key) => (e) => setNarrow((prev) => ({ ...prev, [key]: e.target.value }))
    const filtering = Object.values(narrow).some(Boolean)

    const rows = useMemo(() => {
        if (!list) return []
        return list
            .filter((f) => {
                const v = f.filters ?? {}
                if (narrow.type && f.report_type !== narrow.type) return false
                if (narrow.scope && (narrow.scope === "individual") !== isIndividual(v)) return false
                if (narrow.school_year && v.school_year !== narrow.school_year) return false
                if (narrow.semester && String(v.semester ?? "") !== narrow.semester) return false
                return true
            })
            .map((f) => ({
            id: f.id,
            name: f.name,
            report_type: f.report_type,
            summary: summarizeFilters(f.filters ?? {}),
            created_at: f.created_at,
            raw: f,
        }))
    }, [list, narrow])

    // Generation progress per filter ("filter-<id>"): the job broadcasts
    // each step (GenerateReportJob::progress), so the row shows a bar from
    // 0% to 100%, then View / Download; the page stays where it is.
    const userId = usePage().props.auth?.user?.id
    const [jobs, setJobs] = useState({})
    const setJob = (key, patch) => setJobs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

    useEffect(() => {
        if (!userId || !window.Echo) return
        const channel = window.Echo.private(`job-status.progress.user.${userId}`)
        const onStatus = (e) => {
            if (!String(e.track_id ?? "").startsWith("filter-")) return
            setJobs((prev) => {
                const current = prev[e.track_id] ?? {}
                // Never go backwards (a late "progress" after "ready").
                if (current.status === "ready" || current.status === "failed") return prev
                return { ...prev, [e.track_id]: { ...current, ...e, percent: Math.max(current.percent ?? 0, e.percent ?? (e.status === "failed" ? current.percent ?? 0 : 0)) } }
            })
        }
        channel.listen(".ReportGenerated", onStatus)
        return () => channel.stopListening(".ReportGenerated", onStatus)
    }, [userId])

    const handleGenerate = (row, fileType) => {
        const key = `filter-${row.id}`
        setJob(key, { status: "queued", percent: 0, stage: `Queued (${fileType === "excel" ? "Excel" : "PDF"})`, message: null, view_url: null, download_url: null })
        ReportArchiveService.generateFromReportFilter(
            row.id,
            fileType,
            () => setJob(key, { stage: "Waiting for the report service" }),
            () => setJob(key, { status: "failed", message: "Failed to queue report generation." })
        )
    }
    const anyJob = Object.keys(jobs).length > 0
    const dismiss = (key) => setJobs((prev) => { const next = { ...prev }; delete next[key]; return next })

    const handleDelete = (row) => {
        showWarningModal(
            `Are you sure you want to delete "${row.name}"?`,
            "Delete",
            "Cancel",
            () => {
                showLoadingModal("Deleting the filter")
                ReportArchiveService.deleteReportFilter(
                    row.id,
                    () => { closeLoadingModal(); onChange?.() },
                    () => showOutputModal("Failed to delete filter.", "e")
                )
            }
        )
    }

    const columns = useMemo(() => [
        { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
        ...(showType ? [{
            field: "report_type",
            headerName: "Type",
            width: 130,
            renderCell: (params) => <Chip label={params.value === 'analytics' ? 'Analytical' : toTitleCase(params.value)} size="small" variant="outlined" />,
        }] : []),
        { field: "summary", headerName: "Filter", flex: 1.2, minWidth: 240 },
        {
            field: "created_at",
            headerName: "Created",
            width: 190,
            renderCell: (params) => (
                <span className="text-[0.85em]">
                    {readableDate(params.value)} ({readableTime(params.value)})
                </span>
            ),
        },
        // Shown once something has been generated on this page.
        ...(anyJob ? [{
            field: "progress",
            headerName: "Progress",
            width: 260,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const key = `filter-${params.row.id}`
                const job = jobs[key]
                if (!job) return <span className="text-[0.8em] text-gray-400">—</span>
                if (job.status === "ready") {
                    return (
                        <div className="w-full flex flex-wrap items-center gap-1.5 py-1">
                            <span className="text-[0.8em] font-semibold text-green-700 mr-1">Completed · 100%</span>
                            {job.view_url &&
                            <Tooltip title="View" arrow>
                                <IconButton size="small" component="a" href={job.view_url} target="_blank" rel="noreferrer" aria-label="View" sx={{ color: "var(--dm-text-muted, #374151)" }}>
                                    <Eye size={18} />
                                </IconButton>
                            </Tooltip>}
                            {job.download_url &&
                            <Tooltip title="Download" arrow>
                                <IconButton size="small" component="a" href={job.download_url} aria-label="Download" sx={{ color: "#2563eb" }}>
                                    <Download size={18} />
                                </IconButton>
                            </Tooltip>}
                            <IconButton size="small" onClick={() => dismiss(key)} aria-label="Dismiss"><CloseRounded fontSize="inherit" /></IconButton>
                        </div>
                    )
                }
                if (job.status === "failed") {
                    // "Nothing matched" is a notice (amber); anything else an error (red).
                    const empty = job.reason === "empty"
                    return (
                        <div className="w-full flex items-center gap-1 py-1">
                            <span className={`text-[0.78em] leading-tight ${empty ? "text-amber-700" : "text-red-600"}`}>
                                {empty && <b className="block">No records</b>}
                                {job.message || "Failed to generate the report."}
                            </span>
                            <IconButton size="small" onClick={() => dismiss(key)} aria-label="Dismiss"><CloseRounded fontSize="inherit" /></IconButton>
                        </div>
                    )
                }
                return (
                    <div className="w-full grid gap-1 py-1">
                        <div className="flex justify-between text-[0.75em] text-gray-600">
                            <span className="truncate">{job.stage ?? "Generating"}…</span>
                            <span className="font-semibold">{job.percent ?? 0}%</span>
                        </div>
                        <LinearProgress variant="determinate" value={job.percent ?? 0} sx={{ height: 6, borderRadius: 3 }} />
                    </div>
                )
            },
        }] : []),
        {
            field: "actions",
            type: "actions",
            headerName: "Actions",
            width: generateOnly ? 200 : 270,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                // One Generate button per file type (the Analytical Report is a PDF only).
                const busy = ["queued", "progress"].includes(jobs[`filter-${params.row.id}`]?.status)
                const buttons = (
                    <>
                        <ActionBtn className="bg-red-600 hover:bg-red-700" onClick={() => !busy && handleGenerate(params.row, "pdf")} title="Generate PDF" disabled={busy}>
                            <span className="inline-flex items-center gap-1"><Play size={13} /> PDF</span>
                        </ActionBtn>
                        {params.row.report_type !== "analytics" &&
                        <ActionBtn className="bg-green-600 hover:bg-green-700" onClick={() => !busy && handleGenerate(params.row, "excel")} title="Generate Excel" disabled={busy}>
                            <span className="inline-flex items-center gap-1"><Play size={13} /> Excel</span>
                        </ActionBtn>}
                    </>
                )
                return generateOnly ? (
                <div className="flex items-center gap-2">{buttons}</div>
            ) : (
                <div className="flex items-center gap-2">
                    {buttons}
                    <ActionBtn className="bg-blue-600 hover:bg-blue-700" onClick={() => onEdit?.(params.row.raw)} title="Edit">
                        <Pencil size={14} />
                    </ActionBtn>
                    <ActionBtn className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(params.row)} title="Delete">
                        <Trash2 size={14} />
                    </ActionBtn>
                </div>
            )
            },
        },
    ], [showType, generateOnly, jobs, anyJob])

    return (
        <div className="w-full grid gap-3">
            {showFilters &&
            <div className="flex flex-wrap gap-3">
                <MobileFilters active={countActive(...Object.values(narrow))}>
                    <div className="w-full sm:w-52">
                        <DropdownField default={{ val: "", label: "All Report Types" }} list={TYPE_OPTIONS} onChange={setNarrowBy("type")} name="type" val={narrow.type} keepCase />
                    </div>
                    <div className="w-full sm:w-44">
                        <DropdownField default={{ val: "", label: "All Scopes" }} list={[{ val: "group", label: "Group" }, { val: "individual", label: "Individual Student" }]} onChange={setNarrowBy("scope")} name="scope" val={narrow.scope} keepCase />
                    </div>
                    <div className="w-full sm:w-48">
                        <DropdownField default={{ val: "", label: "All School Years" }} list={[{ val: "all", label: "All School Years (saved)" }, ...schoolYears.map((y) => ({ val: y, label: y }))]} onChange={setNarrowBy("school_year")} name="school_year" val={narrow.school_year} keepCase />
                    </div>
                    <div className="w-full sm:w-44">
                        <DropdownField default={{ val: "", label: "All Semesters" }} list={[{ val: "1", label: "1st Semester" }, { val: "2", label: "2nd Semester" }]} onChange={setNarrowBy("semester")} name="semester" val={narrow.semester} keepCase />
                    </div>
                </MobileFilters>
            </div>}
            <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={list == null}
                    hideFooter
                    disableRowSelectionOnClick
                    getRowHeight={() => "auto"}
                    showToolbar
                    localeText={{ noRowsLabel: filtering ? "No report filters match these dropdowns." : emptyLabel }}
                />
            </Box>
        </div>
    )
}

export default ReportFilterList
