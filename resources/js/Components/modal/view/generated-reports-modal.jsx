import { useEffect, useMemo, useState } from "react"
import UpModal from "../up-modal"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function"
import { DataGrid } from "@mui/x-data-grid"
import Box from "@mui/material/Box"
import { Chip } from "@mui/material"
import ListSkeleton from "../../reload/list-skeleton"
import { FileText, Trash2, Download, Eye, FolderOpen } from "lucide-react"

const GeneratedReportsModal = ({ close, closeModal, pd, isEnableOuterClose }) => {
    const [list, setList] = useState(null)

    const load = () => {
        setList(null)
        ReportArchiveService.getReportHistory(setList)
    }

    useEffect(() => {
        if (close) load()
    }, [close])

    const handleDelete = (report) => {
        showWarningModal(
            `Are You Sure You Want to Delete "${report.report_name}"?`,
            "Delete Report",
            "Cancel",
            () => {
                ReportArchiveService.deleteGeneratedReport(report.id, load, load)
            }
        )
    }

    const rows = useMemo(() => {
        if (!list) return []
        return list.map((r) => ({ id: r.id, ...r }))
    }, [list])

    const columns = useMemo(() => [
        { field: "report_name", headerName: "Report Name", flex: 1, minWidth: 200 },
        {
            field: "report_type",
            headerName: "Type",
            width: 150,
            renderCell: (params) => <Chip label={toTitleCase(params.value)} size="small" variant="outlined" />,
        },
        {
            field: "file_type",
            headerName: "File",
            width: 90,
            renderCell: (params) => params.value?.toUpperCase(),
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
            width: 130,
            renderCell: (params) => {
                const r = params.row
                return (
                    <div className="flex items-center gap-2">
                        {r.view_url &&
                        <a
                            href={r.view_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
                            title="View"
                        >
                            <Eye size={16} />
                        </a>}
                        <a
                            href={r.download_url}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                            title="Download"
                        >
                            <Download size={16} />
                        </a>
                        <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )
            },
        },
    ], [])

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            pd={pd}
            isEnableOuterClose={isEnableOuterClose}
            bgColor="bg-white"
            w="w-[45rem]"
        >
            <div className="w-full grid gap-4">
                <div className="pt-3 flex items-center gap-2 text-[1.2em]">
                    <FileText size="1em" />
                    <h1><b>Generated Reports</b></h1>
                </div>

                {list === null &&
                <div className="py-10 flex justify-center"><ListSkeleton rows={4} /></div>}

                {list !== null && list.length === 0 &&
                <div className="py-10 text-center text-gray-500">
                    <FolderOpen size="2.5em" className="mb-2 mx-auto opacity-60" />
                    <p>No reports generated yet.</p>
                </div>}

                {list !== null && list.length > 0 &&
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                    <Box sx={{ minWidth: "700px", height: 420 }}>
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            hideFooter
                            disableRowSelectionOnClick
                            getRowHeight={() => "auto"}
                            showToolbar
                        />
                    </Box>
                </Box>}
            </div>
        </UpModal>
    )
}

export default GeneratedReportsModal
