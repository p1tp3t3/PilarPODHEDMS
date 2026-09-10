import { Link } from "@inertiajs/react"
import { useMemo } from "react"
import { DataGrid } from "@mui/x-data-grid"
import Box from "@mui/material/Box"
import ProfilePic from "../other/profile-pic"
import { getProfilePic, showUserType } from "@/others/function"
import ActionBtn from "../button/action-btn"

const ChildrenList = ({ list = null, style }) => {
    const rows = useMemo(() => {
        if (!list) return []
        return list.map((e, i) => ({
            id: e.id ?? i,
            name: `${e.profile?.first_name ?? ""} ${e.profile?.middle_name ?? ""} ${e.profile?.last_name ?? ""}`.trim(),
            username: e.username,
            profile_picture: e.profile?.profile_picture,
            sex: e.profile?.sex,
            subtitle: showUserType(e),
        }))
    }, [list])

    const columns = useMemo(() => [
        {
            field: "name",
            headerName: "Child Name",
            flex: 1,
            minWidth: 220,
            renderCell: (params) => (
                <div className="flex gap-3 items-center h-full">
                    <ProfilePic size={1.9} src={getProfilePic(params.row.profile_picture, params.row.sex)} />
                    <div>
                        <h1 className="text-[0.8rem]"><b>{params.value}</b></h1>
                        <p className="text-[0.7em] text-gray-500">{params.row.subtitle}</p>
                    </div>
                </div>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 130,
            renderCell: (params) => (
                <Link href={`/profile/${params.row.username}`}>
                    <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700">
                        View
                    </ActionBtn>
                </Link>
            ),
        },
    ], [])

    return (
        <div className={style && "w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm"}>
            <Box sx={{ width: "100%", overflowX: "auto" }}>
                <Box sx={{ minWidth: "450px" }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        hideFooter
                        disableRowSelectionOnClick
                        getRowHeight={() => "auto"}
                        showToolbar
                        localeText={{ noRowsLabel: list === null ? "Reloading..." : "No Child Yet" }}
                    />
                </Box>
            </Box>
        </div>
    )
}

export default ChildrenList
