import { useEffect, useMemo, useState } from "react"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { readableDate, readableTime, showWarningModal, toTitleCase , showLoadingModal , closeLoadingModal , showOutputModal } from "@/others/function"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { Chip, IconButton, Tooltip } from "@mui/material"
import { Trash2, Download, Eye, FolderOpen } from "lucide-react"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"

// The filter dropdowns: the same fields a saved filter has.
const TYPE_OPTIONS = [
    { val: "incident", label: "Incident Report" },
    { val: "violation", label: "Violation Report" },
    { val: "tardy", label: "Tardy Report" },
    { val: "appointment", label: "Appointment Report" },
    { val: "gatepass", label: "Gate Pass Report" },
    { val: "analytics", label: "Analytical Report" },
]
const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.val, t.label.replace(" Report", "")]))
const isIndividual = (f) => ["1", "true", true, 1].includes(f?.individual) && !!f?.student_id

const NoReportsOverlay = ({ text = "No reports generated yet." }) => (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1, color: "var(--dm-text-soft, #6b7280)", fontSize: "0.9em" }}>
        <FolderOpen size="2.2em" style={{ opacity: 0.6 }} />
        <span>{text}</span>
    </Box>
)

// The "Generated Reports" page — every file GenerateReportJob has produced
// for this prefect, with the filters that produced it (see
// ReportController::summarizeReportFilters) instead of just file info.
// One MUI DataGrid throughout: loading and "none yet" are its own
// loading/no-rows states rather than separate markup.
const GeneratedReportsList = ({ schoolYears = [] }) => {
    const [list, setList] = useState(null)
    const [filter, setFilter] = useState({ type: "", scope: "", school_year: "", semester: "", file_type: "" })
    const set = (key) => (e) => setFilter((prev) => ({ ...prev, [key]: e.target.value }))

    const load = () => {
        setList(null)
        ReportArchiveService.getReportHistory(setList)
    }

    useEffect(() => load(), [])

    const handleDelete = (report) => {
        showWarningModal(
            `Are You Sure You Want to Delete "${report.report_name ?? toTitleCase(report.report_type) + " Report"}"?`,
            "Delete Report",
            "Cancel",
            () => {
                showLoadingModal("Deleting the report")
                ReportArchiveService.deleteGeneratedReport(
                    report.id,
                    () => { closeLoadingModal(); load() },
                    () => { showOutputModal("Failed to delete the report.", "e"); load() },
                )
            }
        )
    }

    // Narrowed by the dropdowns (each report's own filters).
    const rows = useMemo(() => (list ?? [])
        .filter((r) => {
            const f = r.filters ?? {}
            if (filter.type && r.report_type !== filter.type) return false
            if (filter.scope && (filter.scope === "individual") !== isIndividual(f)) return false
            if (filter.school_year && f.school_year !== filter.school_year) return false
            if (filter.semester && String(f.semester ?? "") !== filter.semester) return false
            if (filter.file_type && (r.file_type ?? "pdf") !== filter.file_type) return false
            return true
        })
        .map((r) => ({ id: r.id, ...r })), [list, filter])
    const filtering = Object.values(filter).some(Boolean)

    const columns = useMemo(() => [
        {
            field: "report_name",
            headerName: "Report",
            flex: 1,
            minWidth: 180,
            valueGetter: (value, row) => value || `${toTitleCase(row.report_type ?? "")} Report`,
        },
        {
            field: "report_type",
            headerName: "Type",
            width: 140,
            renderCell: (params) => <Chip label={TYPE_LABEL[params.value] ?? toTitleCase(params.value)} size="small" variant="outlined" />,
        },
        {
            field: "file_type",
            headerName: "File",
            width: 90,
            renderCell: (params) => <Chip label={(params.value ?? "pdf").toUpperCase()} size="small" color={params.value === "excel" || params.value === "xlsx" ? "success" : "error"} variant="outlined" />,
        },
        {
            field: "filters_summary",
            headerName: "Filters Used",
            flex: 1.3,
            minWidth: 220,
            renderCell: (params) => (
                <span className="text-[0.85em] whitespace-normal leading-snug py-2 block">{params.value}</span>
            ),
        },
        {
            field: "created_at",
            headerName: "Generated At",
            width: 190,
            renderCell: (params) => (
                <span className="text-[0.85em]">
                    {readableDate(params.value)} ({readableTime(params.value)})
                </span>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Actions",
            width: 150,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const r = params.row
                return (
                    <div className="flex items-center gap-1 h-full">
                        {r.view_url &&
                        <Tooltip title="View" arrow>
                            <IconButton size="small" component="a" href={r.view_url} target="_blank" rel="noreferrer" aria-label="View" sx={{ color: "var(--dm-text-muted, #374151)" }}>
                                <Eye size={18} />
                            </IconButton>
                        </Tooltip>}
                        <Tooltip title="Download" arrow>
                            <IconButton size="small" component="a" href={r.download_url} aria-label="Download" sx={{ color: "#2563eb" }}>
                                <Download size={18} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete" arrow>
                            <IconButton size="small" onClick={() => handleDelete(r)} aria-label="Delete" sx={{ color: "#dc2626" }}>
                                <Trash2 size={18} />
                            </IconButton>
                        </Tooltip>
                    </div>
                )
            },
        },
    ], [])

    return (
        <div className="w-full min-w-0 grid gap-3">
            <div className="flex flex-wrap gap-3">
                <MobileFilters active={countActive(...Object.values(filter))}>
                    <div className="w-full sm:w-52">
                        <DropdownField default={{ val: "", label: "All Report Types" }} list={TYPE_OPTIONS} onChange={set("type")} name="type" val={filter.type} keepCase />
                    </div>
                    <div className="w-full sm:w-44">
                        <DropdownField default={{ val: "", label: "All Scopes" }} list={[{ val: "group", label: "Group" }, { val: "individual", label: "Individual Student" }]} onChange={set("scope")} name="scope" val={filter.scope} keepCase />
                    </div>
                    <div className="w-full sm:w-48">
                        <DropdownField default={{ val: "", label: "All School Years" }} list={[{ val: "all", label: "All School Years (saved)" }, ...schoolYears.map((y) => ({ val: y, label: y }))]} onChange={set("school_year")} name="school_year" val={filter.school_year} keepCase />
                    </div>
                    <div className="w-full sm:w-44">
                        <DropdownField default={{ val: "", label: "All Semesters" }} list={[{ val: "1", label: "1st Semester" }, { val: "2", label: "2nd Semester" }]} onChange={set("semester")} name="semester" val={filter.semester} keepCase />
                    </div>
                    <div className="w-full sm:w-40">
                        <DropdownField default={{ val: "", label: "All File Types" }} list={[{ val: "pdf", label: "PDF" }, { val: "excel", label: "Excel" }]} onChange={set("file_type")} name="file_type" val={filter.file_type} keepCase />
                    </div>
                </MobileFilters>
            </div>
            <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={list === null}
                    pagination
                    pageSizeOptions={[10, 20, 50]}
                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                    disableRowSelectionOnClick
                    hideFooterSelectedRowCount
                    getRowHeight={() => "auto"}
                    showToolbar
                    localeText={{ noRowsLabel: filtering ? "No reports match these filters." : "No reports generated yet." }}
                    slots={{ noRowsOverlay: () => <NoReportsOverlay text={filtering ? "No reports match these filters." : "No reports generated yet."} /> }}
                    sx={{ minHeight: 220 }}
                    mobileSummary={(row) => ({
                        name: row.report_name || `${toTitleCase(row.report_type ?? "")} Report`,
                        role: `${(row.file_type ?? "pdf").toUpperCase()} · ${readableDate(row.created_at)}`,
                        avatar: false,
                        hide: ["report_name"],
                    })}
                />
            </Box>
        </div>
    )
}

export default GeneratedReportsList
