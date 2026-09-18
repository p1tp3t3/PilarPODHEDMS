import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { useContext, useMemo } from "react"
import AuthContext from "@/context-provider/auth-provider"

import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase, formatSchoolYearSemester } from "../../others/function"
import ProfilePic from "../other/profile-pic"
import ActionBtn from "../button/action-btn"
import ListSkeleton from "../reload/list-skeleton"

const STATUS_STYLES = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    revoked: "bg-gray-200 text-gray-700",
}

const statusFor = (e) => {
    if (e.revoked_at) return "revoked"
    if (e.rejected_at) return "rejected"
    if (e.confirmed_at) return "approved"
    return "pending"
}

const GatePassRequestList = (props) => {
    const { usr } = useContext(AuthContext)
    const urlStatus = new URLSearchParams(window.location.search).get("status")

    const rows = useMemo(() => {
        if (!props.list) return []
        return props.list.map((e, i) => ({
            i: i + 1,
            id: e.id,
            gatepass_number: e.gatepass_number,
            user_id: e.user?.id_number,
            name: (e.user.profile?.first_name ?? '') + ' ' + (e.user.profile?.middle_name ?? '') + " " + (e.user.profile?.last_name ?? '') + ' ' + e.user.role,
            user: e.user,
            created_at: e.created_at,
            confirmed_at: e.confirmed_at,
            rejected_at: e.rejected_at,
            rejected_reason: e.rejected_reason,
            revoked_at: e.revoked_at,
            archived_at: e.archived_at,
            status: statusFor(e),
            school_year_semester: e.school_year_semester,
            confirmed_school_year_semester: e.confirmed_school_year_semester,
            rejected_school_year_semester: e.rejected_school_year_semester,
            revoked_school_year_semester: e.revoked_school_year_semester,
        }))
    }, [props.list])

    const columns = useMemo(() => {
        return [
            {
                field: 'i',
                headerName: '#'
            },
            {
                field: 'gatepass_number',
                headerName: 'Reference No.',
                flex: 0.8,
            },
            {
                field: 'user_id',
                headerName: 'Student I.D'
            },
            {
                field: "name",
                headerName: "Student",
                flex: 1.2,
                sortable: false,
                renderCell: (params) => {
                    const u = params.row.user
                    return (
                        <div className="flex items-center gap-3 h-full">
                            <ProfilePic size={2.5} src={getProfilePic(u?.profile?.profile_picture, u?.profile?.sex)} />
                            <div className="flex flex-col justify-center leading-tight">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[0.9em] font-semibold">
                                        {u ? `${u.profile?.first_name ?? ""} ${u.profile?.last_name ?? ""}` : "-"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[0.75em] font-medium ${STATUS_STYLES[params.row.status]}`}>
                                        {toTitleCase(params.row.status)}
                                    </span>
                                </div>
                                <div className="text-[0.8em] text-gray-600">
                                    {u ? showUserType(u) : "-"}
                                </div>
                                {params.row.rejected_reason && (
                                    <div className="text-[0.75em] text-gray-500">
                                        Reason: {params.row.rejected_reason}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                },
            },
            {
                field: "created_at",
                headerName: "Request Since",
                flex: 1,
                renderCell: (params) => (
                    <div className="text-[0.85em] leading-tight py-2">
                        <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : "-"}</div>
                        {formatSchoolYearSemester(params.row.school_year_semester) && (
                            <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.school_year_semester)}</div>
                        )}
                    </div>
                ),
            },
            ...(urlStatus === "rejected-requests" ? [{
                field: "rejected_at",
                headerName: "Rejected Since",
                flex: 1,
                renderCell: (params) => (
                    <div className="text-[0.85em] leading-tight py-2">
                        <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : "-"}</div>
                        {formatSchoolYearSemester(params.row.rejected_school_year_semester) && (
                            <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.rejected_school_year_semester)}</div>
                        )}
                    </div>
                ),
            }] : []),
            ...(urlStatus === "revoked-requests" ? [{
                field: "revoked_at",
                headerName: "Revoked Since",
                flex: 1,
                renderCell: (params) => (
                    <div className="text-[0.85em] leading-tight py-2">
                        <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : "-"}</div>
                        {formatSchoolYearSemester(params.row.revoked_school_year_semester) && (
                            <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.revoked_school_year_semester)}</div>
                        )}
                    </div>
                ),
            }] : []),
            {
                field: "actions",
                type: "actions",
                headerName: "Action",
                width: 300,
                align: 'start',
                headerAlign: 'start',
                renderCell: (params) => (
                    <div className="flex flex-wrap gap-2 items-center py-1">
                        <ActionBtn
                            className="bg-blue-700 hover:bg-blue-800"
                            onClick={() => props.view(params.row.id)}
                        >
                            View
                        </ActionBtn>

                        {usr?.role === "sub_admin" && params.row.status === "pending" && (
                            <>
                                <ActionBtn
                                    className="bg-green-500 hover:bg-green-600"
                                    onClick={() => props.events(params.row.id, "confirm")}
                                >
                                    Accept
                                </ActionBtn>
                                <ActionBtn
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => props.events(params.row.id, "cancel")}
                                >
                                    Reject
                                </ActionBtn>
                            </>
                        )}
                    </div>
                ),
            },
        ]
    }, [usr?.role, props, urlStatus])

    // Loading state (props.list === null)
    if (props.list === null) {
        return (
            <div className="w-full px-5 py-10 bg-white rounded-md shadow-black/20 shadow-sm flex justify-center">
                <ListSkeleton rows={4} />
            </div>
        )
    }

    return (
        <Box
            sx={{
                width: "100%",
                minWidth: 0,
                overflow: "hidden",
                backgroundColor: "#fff",
                borderRadius: 2,
                boxShadow: 2,
                p: 2,
            }}
        >
            <DataGrid
                rows={rows}
                columns={columns}
                pageSizeOptions={[5, 10, 20]}
                initialState={{
                    pagination: { paginationModel: { pageSize: 10, page: 0 } },
                }}
                pagination
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                localeText={{ noRowsLabel: "No Gate Pass Request Yet" }}
                showToolbar
            />
        </Box>
    )
}

export default GatePassRequestList