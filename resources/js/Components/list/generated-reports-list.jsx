import { useEffect, useMemo, useState } from "react"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { Chip, IconButton, Tooltip } from "@mui/material"
import { Trash2, Download, Eye, FolderOpen } from "lucide-react"

const NoReportsOverlay = () => (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1, color: "#6b7280", fontSize: "0.9em" }}>
        <FolderOpen size="2.2em" style={{ opacity: 0.6 }} />
        <span>No reports generated yet.</span>
    </Box>
)

// The "Generated Reports" page — every file GenerateReportJob has produced
// for this prefect, with the filters that produced it (see
// ReportController::summarizeReportFilters) instead of just file info.
// One MUI DataGrid throughout: loading and "none yet" are its own
// loading/no-rows states rather than separate markup.
const GeneratedReportsList = () => {
    const [list, setList] = useState(null)

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
                ReportArchiveService.deleteGeneratedReport(report.id, load, load)
            }
        )
    }

    const rows = useMemo(() => (list ?? []).map((r) => ({ id: r.id, ...r })), [list])

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
            renderCell: (params) => <Chip label={toTitleCase(params.value)} size="small" variant="outlined" />,
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
                            <IconButton size="small" component="a" href={r.view_url} target="_blank" rel="noreferrer" aria-label="View" sx={{ color: "#374151" }}>
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
        <div className="w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
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
                    autoHeight
                    localeText={{ noRowsLabel: "No reports generated yet." }}
                    slots={{ noRowsOverlay: NoReportsOverlay }}
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
