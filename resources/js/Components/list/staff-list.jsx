import ProfilePic from "../other/profile-pic"
import { checkActiveStatus, getProfilePic, readableDate, readableTime, showUserType } from "@/others/function"
import { Link } from "@inertiajs/react"
import PaginationButton from "../button/pagination-btn"
import { useEffect, useMemo, useState, useContext } from "react"
import { DataGrid } from "@mui/x-data-grid"
import Box from "@mui/material/Box"
import ActionBtn from "../button/action-btn"
import AuthContext from "@/context-provider/auth-provider"

const StaffList = ({ list }) => {
    const { isUserOnline } = useContext(AuthContext)
    const l = list.data

    // Ticks every 5s so the "Active Since" column's relative-time text and
    // online/offline dot stay live without needing a page refresh.
    const [, forceTick] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => forceTick((n) => n + 1), 5000)
        return () => clearInterval(interval)
    }, [])

    const rows = useMemo(() => l.map((e, i) => ({
        id: e.id,
        i: i + 1,
        user_id: e.id_number,
        username: e.username,
        subtitle: showUserType(e),
        profile_picture: e.profile?.profile_picture,
        sex: e.profile?.sex,
        name: `${e.profile?.first_name ?? ""} ${e.profile?.last_name ?? ""}`,
        created_at: e.created_at,
        last_seen: e.last_seen,
    })), [l])

    const columns = useMemo(() => [
        { field: "i", headerName: "#", width: 50 },
        { field: "user_id", headerName: "Staff ID", width: 150 },
        {
            field: "name",
            headerName: "Staff Member",
            flex: 1,
            minWidth: 220,
            renderCell: (params) => (
                <div className="flex gap-3 items-center h-full py-1">
                    <ProfilePic
                        size={1.9}
                        src={getProfilePic(params.row.profile_picture, params.row.sex)}
                        showActive={true}
                        isActive={isUserOnline(params.row.id) || checkActiveStatus(params.row.last_seen)}
                        activeSize={0.9}
                    />
                    <div>
                        <h1 className="text-[0.8rem]"><b>{params.value}</b></h1>
                        <p className="text-[0.7rem] text-gray-600">{params.row.subtitle}</p>
                    </div>
                </div>
            ),
        },
        {
            field: "created_at",
            headerName: "Registered Since",
            width: 170,
            renderCell: (params) => (
                <div>
                    <div className="text-[0.8rem]">{readableDate(params.value)}</div>
                    <div className="text-[0.7em]">{readableTime(params.value)}</div>
                </div>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 120,
            renderCell: (params) => (
                <Link href={`/profile/${params.row.username}`}>
                    <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700">
                        View
                    </ActionBtn>
                </Link>
            ),
        },
    ], [isUserOnline])

    return (
        <div className="w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm">
            <div className="grid gap-4">
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                    <Box sx={{ minWidth: "800px" }}>
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            hideFooter
                            disableRowSelectionOnClick
                            getRowHeight={() => "auto"}
                            showToolbar
                            localeText={{ noRowsLabel: "No Staff Found" }}
                        />
                    </Box>
                </Box>
                <div className="justify-self-end">
                    <PaginationButton meta={list} />
                </div>
            </div>
        </div>
    )
}

export default StaffList
