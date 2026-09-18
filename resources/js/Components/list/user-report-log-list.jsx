import { useMemo, useState } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { getProfilePic, readableDate, readableTime, toTitleCase } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import PaginationButton from "../button/pagination-btn"
import ActionBtn from "../button/action-btn"
import ViewActionLogModal from "../modal/view/view-action-log-modal"
import { Eye } from "lucide-react"


const UserReportLogList = ({ list = null }) => {
    const [viewLog, setViewLog] = useState(null)
    const [viewOpen, setViewOpen] = useState(false)

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
            has_changes: Object.keys(e.details_changes ?? {}).length > 0,
            created_at: e.created_at,
            raw: e,
        }))
    }, [list])

    const openDetail = (row) => {
        setViewLog(row.raw)
        setViewOpen(true)
    }

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
        {
            field: "actions",
            type: "actions",
            headerName: "",
            width: 70,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <ActionBtn
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => openDetail(params.row)}
                    title={params.row.has_changes ? "View before/after details" : "View details"}
                >
                    <Eye size={14} />
                </ActionBtn>
            ),
        },
    ], [])

    return (
        <div className="w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm grid gap-3">
            <ViewActionLogModal
                close={viewOpen}
                closeModal={setViewOpen}
                log={viewLog}
            />
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
