import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { getProfilePic, getYearLevel, readableDate, readableTime, toTitleCase } from "@/others/function"
import ListSkeleton from "../reload/list-skeleton"
import ProfilePic from "../other/profile-pic"
import { router } from "@inertiajs/react"

const IncidentReportList = ({ list }) => {
    if (list == null) {
        return (
            <div className="w-full bg-white rounded-md shadow-md p-4">
                <div className="flex justify-center py-12">
                    <ListSkeleton rows={5} />
                </div>
            </div>
        )
    }

    const rows = list.data.map((e, index) => ({
        id: e.id ?? `${list.from + index}`,
        index: list.from + index,
        student_id: e.user?.id_number,
        student: e.user,
        complaint: e.complaint,
    }))

    const columns = [
        {
            field: "index",
            headerName: "#",
            width: 80,
            sortable: false,
            renderCell: (params) => (
                <span className="text-[0.8em]">{params.value}.</span>
            ),
        },
        {
            field: "student_id",
            headerName: "Student ID",
            width: 120,
            sortable: false,
        },
        {
            field: "student_col",
            headerName: "Student",
            flex: 1.5,
            sortable: false,
            renderCell: (params) => {
                const student = params.row.student
                const isStudent = student?.role === "student"
                const latestEnrollment = student?.enrollments?.[student.enrollments.length - 1]
                const programName = isStudent
                    ? student?.program?.name
                    : student?.teaching_staff?.program?.name
                const roleDetail = isStudent
                    ? (latestEnrollment?.year_level ? getYearLevel(latestEnrollment.year_level) : null)
                    : (student?.teaching_staff?.position === "program_head" ? "Program Head" : "Faculty")

                return (
                    <div className="flex items-center gap-3 h-full">
                        <ProfilePic
                            size={2}
                            src={getProfilePic(student?.profile?.profile_picture, student?.profile?.sex)}
                        />
                        <div className="flex flex-col justify-center leading-tight">
                            <p className="font-semibold text-gray-800 text-[0.85em]">
                                {toTitleCase(
                                    `${student?.profile?.first_name || ""} ${student?.profile?.middle_name || ""} ${student?.profile?.last_name || ""}`
                                )}
                            </p>
                            <p className="text-[0.75em] text-gray-600">
                                {[programName, roleDetail].filter(Boolean).join(" · ") || "-"}
                            </p>
                        </div>
                    </div>
                )
            },
        },
        {
            field: "incident",
            headerName: "Incident",
            flex: 1.6,
            sortable: false,
            valueGetter: (_, row) => row.complaint?.violation?.violation_name || "-",
            renderCell: (params) => (
                <span className="text-[0.85em] line-clamp-2">
                    {toTitleCase(params.value || "-")}
                </span>
            ),
        },
        {
            field: "reported_at",
            headerName: "Reported Since",
            flex: 1,
            sortable: false,
            valueGetter: (_, row) => row.complaint?.created_at || null,
            renderCell: (params) => (
                <span className="text-[0.83em] whitespace-nowrap">
                    {params.value
                        ? `${readableDate(params.value)} (${readableTime(params.value)})`
                        : "-"}
                </span>
            ),
        },
    ]

    const handlePaginationModelChange = (model) => {
        router.get(
            window.location.pathname,
            {
                report_page: model.page + 1,
                report_per_page: model.pageSize,
            },
            { preserveScroll: true }
        )
    }

    return (
        <div className="w-full bg-white rounded-md shadow-md p-4">
            <Box
                sx={{
                    width: "100%",
                    minWidth: 0,
                    overflow: "auto",
                    "& .MuiDataGrid-root": {
                        border: "none",
                    },
                    "& .MuiDataGrid-columnHeaders": {
                        backgroundColor: "#f9fafb",
                        fontWeight: "bold",
                    },
                    "& .MuiDataGrid-cell": {
                        alignItems: "center",
                    },
                }}
            >
                <DataGrid
                    autoHeight
                    rows={rows}
                    columns={columns}
                    disableRowSelectionOnClick
                    hideFooterSelectedRowCount
                    paginationMode="server"
                    rowCount={list.total ?? rows.length}
                    paginationModel={{
                        page: (list.current_page ?? 1) - 1,
                        pageSize: list.per_page ?? rows.length,
                    }}
                    onPaginationModelChange={handlePaginationModelChange}
                    pageSizeOptions={[10, 20, 50, 100]}
                    sx={{
                        border: "none",
                    }}
                    localeText={{ noRowsLabel: "No Reports Found" }}
                    showToolbar
                />
            </Box>
        </div>
    )
}

export default IncidentReportList
