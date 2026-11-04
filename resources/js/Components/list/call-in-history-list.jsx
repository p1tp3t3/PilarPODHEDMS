import { useEffect, useMemo, useState } from "react"
import { Link } from "@inertiajs/react"
import Box from "@mui/material/Box"
import { DataGrid } from "@/Components/other/data-grid"
import ProfilePic from "@/Components/other/profile-pic"
import ActionBtn from "@/Components/button/action-btn"
import { AppointmentService } from "@/others/services/appointment-service"
import { getProfilePic, profileUrl, readableDate, readableTime } from "@/others/function"

/**
 * The prefect's history of call-ins: which student was called in, why, by
 * whom, when, and whether the student has opened it yet. Loaded when the
 * tab is opened; `refreshKey` reloads it (e.g. after a new call-in).
 */
const CallInHistoryList = ({ refreshKey = 0 }) => {
    const [list, setList] = useState(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        setFailed(false)
        AppointmentService.getCallInHistory(setList, () => setFailed(true))
    }, [refreshKey])

    const rows = useMemo(() => (list ?? []).map((e, i) => ({ ...e, i: i + 1 })), [list])

    const columns = useMemo(() => [
        { field: "i", headerName: "#", width: 55 },
        {
            field: "student",
            headerName: "Student",
            flex: 1.2,
            minWidth: 220,
            valueGetter: (_, row) => row.student?.name ?? "Deleted account",
            renderCell: ({ row, value }) => (
                <div className="flex items-center gap-3 h-full py-1">
                    <ProfilePic size={1.9} src={getProfilePic(row.student?.profile_picture, row.student?.sex)} />
                    <div className="leading-tight min-w-0">
                        <div className="text-[0.8em] font-bold truncate">{value}</div>
                        <div className="text-[0.7em] text-gray-500">{row.student?.id_number}</div>
                    </div>
                </div>
            ),
        },
        { field: "program", headerName: "Program", width: 110, valueGetter: (_, row) => row.student?.program ?? "N/A" },
        { field: "reason", headerName: "Reason", flex: 1.5, minWidth: 220, valueGetter: (v) => v ?? "N/A" },
        { field: "called_by", headerName: "Called In By", width: 160, valueGetter: (v) => v ?? "N/A" },
        {
            field: "created_at",
            headerName: "Date / Time",
            width: 150,
            renderCell: ({ value }) => (
                <div className="leading-tight">
                    <div className="text-[0.85em]">{readableDate(value)}</div>
                    <div className="text-[0.7em] text-gray-500">{readableTime(value)}</div>
                </div>
            ),
        },
        {
            field: "read_since",
            headerName: "Status",
            width: 120,
            valueGetter: (v) => (v ? "Seen" : "Not seen yet"),
            renderCell: ({ row, value }) => (
                <span
                    title={row.read_since ? `Seen ${readableDate(row.read_since)} (${readableTime(row.read_since)})` : undefined}
                    className={`px-2 py-0.5 rounded-full text-[0.75em] font-medium ${
                        row.read_since ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                >
                    {value}
                </span>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 100,
            renderCell: ({ row }) => row.student && (
                <Link href={profileUrl(row.student)}>
                    <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700">View</ActionBtn>
                </Link>
            ),
        },
    ], [])

    return (
        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={list === null && !failed}
                mobileSummary={(row) => ({
                    name: row.student?.name ?? "Deleted account",
                    role: row.student?.id_number,
                    picture: row.student?.profile_picture,
                    sex: row.student?.sex,
                    hide: ["student"],
                })}
                disableRowSelectionOnClick
                getRowHeight={() => "auto"}
                showToolbar
                pagination
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                pageSizeOptions={[20, 50, 100]}
                localeText={{ noRowsLabel: failed ? "Failed to load the call-in history." : "No call-ins yet." }}
            />
        </Box>
    )
}

export default CallInHistoryList
