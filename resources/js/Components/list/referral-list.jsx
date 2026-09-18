import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { useContext, useMemo } from "react"
import AuthContext from "@/context-provider/auth-provider"

import { getProfilePic, readableDate, readableTime, toTitleCase, formatSchoolYearSemester } from "../../others/function"
import ProfilePic from "../other/profile-pic"
import ListSkeleton from "../reload/list-skeleton"
import ActionBtn from "../button/action-btn"

const STATUS_STYLES = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    revoked: "bg-gray-200 text-gray-700",
}

const ReferralList = ({ style, list = null, type, events, viewReferral }) => {
    const { usr } = useContext(AuthContext)

    const urlStatus = useMemo(() => {
        return new URLSearchParams(window.location.search).get("status")
    }, [])
    const isApprovedView = urlStatus === "approve"

    const rows = useMemo(() => {
        if (!list) return []
        return list.map((e, i) => ({
            id: e.id,
            index: i + 1,
            referral_number: e.referral_number,
            referrer: e.user,          // used when type === 'sub_admin'
            created_at: e.created_at,
            confirmed_at: e.confirmed_at,
            rejected_at: e.rejected_at,
            revoked_at: e.revoked_at,
            status: e.referral_status,
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
            field: "status",
            headerName: "Status",
            width: 110,
            renderCell: (params) => (
                <span className={`px-2 py-0.5 rounded-full text-[0.75em] font-medium ${STATUS_STYLES[params.value] ?? "bg-gray-100 text-gray-700"}`}>
                    {toTitleCase(params.value ?? "pending")}
                </span>
            ),
        })

        cols.push({
            field: "created_at",
            headerName: "Reported Since",
            width: 180,
            renderCell: (params) => (
                <div className="leading-tight py-2">
                    <div>{`${readableDate(params.value)} (${readableTime(params.value)})`}</div>
                    {formatSchoolYearSemester(params.row.raw?.school_year_semester) && (
                        <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.raw?.school_year_semester)}</div>
                    )}
                </div>
            ),
        })

        if (isApprovedView) {
            cols.push({
                field: "confirmed_at",
                headerName: "Confirmed Since",
                width: 180,
                renderCell: (params) => (
                    <div className="leading-tight py-2">
                        <div>{`${readableDate(params.value)} (${readableTime(params.value)})`}</div>
                        {formatSchoolYearSemester(params.row.raw?.confirmed_school_year_semester) && (
                            <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.raw?.confirmed_school_year_semester)}</div>
                        )}
                    </div>
                ),
            })
        }

        if (urlStatus === "rejected") {
            cols.push({
                field: "rejected_at",
                headerName: "Rejected Since",
                width: 180,
                renderCell: (params) => (
                    <div className="leading-tight py-2">
                        <div>{`${readableDate(params.value)} (${readableTime(params.value)})`}</div>
                        {formatSchoolYearSemester(params.row.raw?.rejected_school_year_semester) && (
                            <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.raw?.rejected_school_year_semester)}</div>
                        )}
                    </div>
                ),
            })
        }

        if (urlStatus === "revoked") {
            cols.push({
                field: "revoked_at",
                headerName: "Revoked Since",
                width: 180,
                renderCell: (params) => (
                    <div className="leading-tight py-2">
                        <div>{`${readableDate(params.value)} (${readableTime(params.value)})`}</div>
                        {formatSchoolYearSemester(params.row.raw?.revoked_school_year_semester) && (
                            <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.raw?.revoked_school_year_semester)}</div>
                        )}
                    </div>
                ),
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
            width: usr?.role === "sub_admin" ? 640 : 300,
            renderCell: (params) => {
                const row = params.row
                const canModerate = usr?.role === "sub_admin" && !row.confirmed_at && !row.rejected_at && !row.revoked_at
                const isOwner = row.raw?.teaching_staff_id === usr?.id
                const isPending = row.raw?.referral_status === "pending" && !row.confirmed_at

                return (
                    <div className="flex flex-wrap items-center gap-2 text-[0.9em] py-1">
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
                                    Send to Guidance
                                </ActionBtn>

                                <ActionBtn
                                    className="bg-purple-500 hover:bg-purple-600"
                                    onClick={() => window.open(`/referral/verify/${row.id}/send-it-staff`, "_blank")}
                                >
                                    Send to IT Staff
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
    }, [type, isApprovedView, urlStatus, usr?.role, events, viewReferral])

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

    return (
        <div className={style && "w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm"}>
            {usr?.role === "sub_admin" && (
                <iframe src={""} frameBorder="0" className="hidden" id="print-doc"></iframe>
            )}

            <Box
                sx={{
                    width: "100%",
                    minWidth: 0,
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    borderRadius: 2,
                    boxShadow: style ? 0 : 2,
                    p: style ? 0 : 2,
                }}
            >
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSizeOptions={[5, 10, 20]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10, page: 0 } },
                    }}
                    disableRowSelectionOnClick
                    pagination
                    getRowHeight={() => 'auto'}
                    localeText={{ noRowsLabel: "No Referrals Found" }}
                    showToolbar
                />
            </Box>
        </div>
    )
}

export default ReferralList