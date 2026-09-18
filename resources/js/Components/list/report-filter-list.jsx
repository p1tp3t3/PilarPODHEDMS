import { useMemo } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { Chip } from "@mui/material"
import { readableDate, readableTime, toTitleCase, showWarningModal, showOutputModal } from "@/others/function"
import ActionBtn from "../button/action-btn"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { Play, Pencil, Trash2 } from "lucide-react"

const summarizeFilters = (filters) => {
    const parts = []

    if (filters.school_year) {
        parts.push(`SY ${filters.school_year}`)
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

    parts.push((filters.file_type ?? "pdf").toUpperCase())

    return parts.join(" • ")
}

// Every saved filter can be re-run (Generate), tweaked (Edit, reopens the
// same form pre-filled), or removed (Delete) — replacing the old flow
// where the filter form always produced a file immediately and was thrown
// away right after.
const ReportFilterList = ({ list = null, onEdit, onChange, showType = true }) => {
    const rows = useMemo(() => {
        if (!list) return []
        return list.map((f) => ({
            id: f.id,
            name: f.name,
            report_type: f.report_type,
            summary: summarizeFilters(f.filters ?? {}),
            created_at: f.created_at,
            raw: f,
        }))
    }, [list])

    const handleGenerate = (row) => {
        ReportArchiveService.generateFromReportFilter(
            row.id,
            () => showOutputModal("Report queued — check \"Generated Reports\" for the download link once it's ready.", "s"),
            () => showOutputModal("Failed to queue report generation.", "e")
        )
    }

    const handleDelete = (row) => {
        showWarningModal(
            `Are you sure you want to delete "${row.name}"?`,
            "Delete",
            "Cancel",
            () => {
                ReportArchiveService.deleteReportFilter(
                    row.id,
                    () => onChange?.(),
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
            renderCell: (params) => <Chip label={toTitleCase(params.value)} size="small" variant="outlined" />,
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
        {
            field: "actions",
            type: "actions",
            headerName: "Actions",
            width: 170,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <div className="flex items-center gap-2">
                    <ActionBtn className="bg-green-600 hover:bg-green-700" onClick={() => handleGenerate(params.row)} title="Generate">
                        <Play size={14} />
                    </ActionBtn>
                    <ActionBtn className="bg-indigo-600 hover:bg-indigo-700" onClick={() => onEdit?.(params.row.raw)} title="Edit">
                        <Pencil size={14} />
                    </ActionBtn>
                    <ActionBtn className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(params.row)} title="Delete">
                        <Trash2 size={14} />
                    </ActionBtn>
                </div>
            ),
        },
    ], [showType])

    return (
        <div className="w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm grid gap-3">
            <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    hideFooter
                    disableRowSelectionOnClick
                    getRowHeight={() => "auto"}
                    showToolbar
                    localeText={{ noRowsLabel: "No Saved Filters Yet" }}
                />
            </Box>
        </div>
    )
}

export default ReportFilterList
