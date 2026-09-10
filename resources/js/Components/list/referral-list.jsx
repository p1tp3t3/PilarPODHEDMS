import { DataGrid } from "@mui/x-data-grid"
import Box from "@mui/material/Box"
import { useContext, useMemo } from "react"
import AuthContext from "@/context-provider/auth-provider"

import { getProfilePic, readableDate, readableTime, toTitleCase } from "../../others/function"
import ProfilePic from "../other/profile-pic"
import ListSkeleton from "../reload/list-skeleton"
import ActionBtn from "../button/action-btn"
import { Folder } from "lucide-react"

const ReferralList = ({ style, list = null, type, events, viewReferral }) => {
    const { usr } = useContext(AuthContext)

    const isApprovedView = useMemo(() => {
        return new URLSearchParams(window.location.search).get("status") === "approve"
    }, [])

    const rows = useMemo(() => {
        if (!list) return []
        return list.map((e, i) => ({
            id: e.id,
            index: i + 1,
            referral_number: e.referral_number,
            referrer: e.user,          // used when type === 'sub_admin'
            created_at: e.created_at,
            confirmed_at: e.confirmed_at,
            raw: e,                    // keep entire object if you need later
        }))
    }, [list])

    const columns = useMemo(() => {
        const cols = [
            {
                field: "index",
                headerName: "#",
                width: 70,
                sortable: false,
            },
            {
                field: "referral_number",
                headerName: "Reference No.",
                width: 130,
            },
        ]

        if (type === "sub_admin") {
            cols.push({
                field: "referrerCol",
                headerName: "Referrer",
                width: 250,
                sortable: false,
                renderCell: (params) => {
                    const u = params.row.referrer

                    const roleLabel =
                        u?.role === "teaching_staff"
                            ? `Teaching Staff (${u?.teaching_staff?.program?.name || "N/A"})`
                            : "Prefect"

                    return (
                        <div className="flex items-center gap-3 h-full">
                            <ProfilePic src={getProfilePic(u?.profile?.profile_picture, u?.profile?.sex)} size={2} />
                            <div className="flex flex-col justify-center leading-tight">
                                <div className="text-[0.8em] font-semibold">
                                    {u ? `${u.profile?.first_name ?? ""} ${u.profile?.middle_name ?? ""} ${u.profile?.last_name ?? ""}` : "-"}
                                </div>
                                <div className="text-[0.7em] text-gray-600">
                                    {roleLabel}
                                </div>
                            </div>
                        </div>
                    )
                },
            })
        }

        cols.push({
            field: "created_at",
            headerName: "Reported Since",
            width: 180,
            renderCell: (params) => `${readableDate(params.value)} (${readableTime(params.value)})`,
        })

        if (isApprovedView) {
            cols.push({
                field: "confirmed_at",
                headerName: "Confirmed Since",
                width: 180,
                renderCell: (params) => `${readableDate(params.value)} (${readableTime(params.value)})`,
            })
        }

        cols.push({
            field: "action",
            headerName: "Action",
            type: 'actions',
            align: 'start',
            headerAlign: 'start',
            sortable: false,
            filterable: false,
            width: usr?.role === "sub_admin" ? 420 : 260,
            renderCell: (params) => {
                const row = params.row
                const canModerate = usr?.role === "sub_admin" && !row.confirmed_at
                const isOwner = row.raw?.teaching_staff_id === usr?.id
                const isPending = row.raw?.referral_status === "pending" && !row.confirmed_at

                return (
                    <div className="flex items-center gap-2 text-[0.9em]">
                        <ActionBtn
                            className="bg-blue-700 hover:bg-blue-800"
                            onClick={() => viewReferral(row.id)}
                        >
                            View
                        </ActionBtn>

                        {canModerate && (
                            <>
                                <ActionBtn
                                    className="bg-green-500 hover:bg-green-600"
                                    onClick={() => events("confirm", row.id)}
                                >
                                    Approve
                                </ActionBtn>

                                <ActionBtn
                                    className="bg-orange-500 hover:bg-orange-600"
                                    onClick={() => window.open(`/referral/verify/${row.id}/send-guidance`, "_blank")}
                                >
                                    Generate Guidance Document
                                </ActionBtn>

                                <ActionBtn
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => events("cancel", row.id)}
                                >
                                    Reject
                                </ActionBtn>
                            </>
                        )}

                        {isOwner && isPending && !row.raw?.edited_at && (
                            <ActionBtn
                                className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => events("edit", row.id)}
                            >
                                Edit
                            </ActionBtn>
                        )}

                        {isOwner && isPending && (
                            <ActionBtn
                                className="bg-gray-600 hover:bg-gray-700"
                                onClick={() => events("revoke", row.id)}
                            >
                                Revoke
                            </ActionBtn>
                        )}

                        {usr?.role === "sub_admin" && !row.raw?.archived_at && (
                            <ActionBtn
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => events("archive", row.id)}
                            >
                                Archive
                            </ActionBtn>
                        )}
                    </div>
                )
            },
        })

        return cols
    }, [type, isApprovedView, usr?.role, events, viewReferral])

    // Loading state (same logic as your table)
    if (list === null) {
        return (
            <div className={style ? "w-full px-5 py-10 bg-white rounded-md shadow-black/20 shadow-sm" : ""}>
                <div className="flex justify-center items-center w-full">
                    <ListSkeleton rows={4} />
                </div>
            </div>
        )
    }

    // Empty state
    if (list.length === 0) {
        const colSpan = type !== "prefect" ? 3 : (isApprovedView ? 5 : 4)
        return (
            <div className={style ? "w-full px-5 py-10 bg-white rounded-md shadow-black/20 shadow-sm" : ""}>
                <div className="flex justify-center items-center w-full">
                    <div className="grid place-items-center text-gray-600">
                        <div className="text-[4em]">
                            <Folder size="1em" />
                        </div>
                        <div>
                            <b>No Referrals Found</b>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={style && "w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm"}>
            {usr?.role === "sub_admin" && (
                <iframe src={""} frameBorder="0" className="hidden" id="print-doc"></iframe>
            )}

            <Box
                sx={{
                    width: "100%",
                    backgroundColor: "#fff",
                    borderRadius: 2,
                    boxShadow: style ? 0 : 2,
                    p: style ? 0 : 2,
                    overflowX: "auto",
                }}
            >
                <Box sx={{ minWidth: "1200px" }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        pageSizeOptions={[5, 10, 20]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10, page: 0 } },
                        }}
                        disableRowSelectionOnClick
                        pagination
                        showToolbar
                    />
                </Box>
            </Box>
        </div>
    )
}

export default ReferralList