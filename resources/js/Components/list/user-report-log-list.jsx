import { useMemo } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { getProfilePic, readableDate, readableTime, toTitleCase } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import PaginationButton from "../button/pagination-btn"


const UserReportLogList = ({ list = null, showUser = true }) => {
    const rows = useMemo(() => {
        if (!list?.data) return []
        return list.data.map((e, i) => ({
            id: e.id ?? i,
            i: i + 1,
            user: e.user,
            action_type: toTitleCase(e.action_type),
            // Older rows only ever had a plain sentence in `details` — the
            // resource falls back to that same text as details_summary, so
            // this always has something readable to show either way.
            details: e.details_summary,
            created_at: e.created_at,
        }))
    }, [list])

    const columns = useMemo(() => [
        { field: "i", headerName: "#", width: 50 },
        ...(!showUser ? [] : [{
            field: "id_number",
            headerName: "User ID",
            width: 120,
            valueGetter: (_, row) => row.user?.id_number ?? "N/A",
        }, {
            field: "user",
            headerName: "User",
            flex: 1.2,
            minWidth: 200,
            valueGetter: (_, row) => `${row.user?.profile?.first_name ?? ""} ${row.user?.profile?.last_name ?? ""}`.trim(),
            renderCell: (params) => {
                const u = params.row.user
                return (
                    <div className="flex gap-3 items-center h-full py-1">
                        <div className="z-1">
                            <ProfilePic size={1.9} src={getProfilePic(u?.profile?.profile_picture, u?.profile?.sex)} />
                        </div>
                        <h1 className="text-[0.8em]"><b>{params.value}</b></h1>
                    </div>
                )
            },
        }, {
            field: "role",
            headerName: "Role",
            width: 150,
            valueGetter: (_, row) => row.user?.role ? toTitleCase(row.user.role.replace(/_/g, " ")) : "N/A",
        }]),
        { field: "action_type", headerName: "Action Type", width: 150 },
        { field: "details", headerName: "Details", flex: 1, minWidth: 220 },
        {
            field: "created_at",
            headerName: "Date / Time",
            width: 190,
            renderCell: (params) => (
                <span className="text-[0.85em]">
                    {readableDate(params.value)} ({readableTime(params.value)})
                </span>
            ),
        },
    ], [showUser])

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
                    localeText={{ noRowsLabel: "No Logs Yet" }}
                />
            </Box>
            {(list.data.length != 0 && list.data.length >= 50) &&
            <div className="justify-self-end">
                <PaginationButton meta={list} />
            </div>}
        </div>
    )
}

export default UserReportLogList
