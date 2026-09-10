import { useMemo } from "react"
import { DataGrid } from "@mui/x-data-grid"
import Box from "@mui/material/Box"
import { getProfilePic, readableDate, readableTime, toTitleCase } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import PaginationButton from "../button/pagination-btn"


const UserReportLogList = ({ list = null }) => {
    const rows = useMemo(() => {
        if (!list?.data) return []
        return list.data.map((e, i) => ({
            id: e.id ?? i,
            i: i + 1,
            user: e.user,
            action_type: toTitleCase(e.action_type),
            details: toTitleCase(e.details),
            created_at: e.created_at,
        }))
    }, [list])

    const columns = useMemo(() => [
        { field: "i", headerName: "#", width: 50 },
        {
            field: "user",
            headerName: "User",
            flex: 1.2,
            minWidth: 240,
            renderCell: (params) => {
                const u = params.value
                return (
                    <div className="flex gap-3 items-center h-full py-1">
                        <div className="z-1">
                            <ProfilePic size={1.9} src={getProfilePic(u?.profile?.profile_picture, u?.profile?.sex)} />
                        </div>
                        <div>
                            <h1 className="text-[0.8em]">
                                <b>{`${u?.profile?.first_name ?? ""} ${u?.profile?.last_name ?? ""}`}</b>
                            </h1>
                            <p className="text-[0.7em]">({toTitleCase(u?.id_number ?? "")})</p>
                            <p className="text-[0.7em]">{toTitleCase(u?.role ?? "")}</p>
                        </div>
                    </div>
                )
            },
        },
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
    ], [])

    return (
        <div className="w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm grid gap-3">
            <Box sx={{ width: "100%", overflowX: "auto" }}>
                <Box sx={{ minWidth: "800px" }}>
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
            </Box>
            {(list.data.length != 0 && list.data.length >= 50) &&
            <div className="justify-self-end">
                <PaginationButton meta={list} />
            </div>}
        </div>
    )
}

export default UserReportLogList
