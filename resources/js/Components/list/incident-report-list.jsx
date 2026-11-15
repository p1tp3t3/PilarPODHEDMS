import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { getProfilePic, getYearLevel, readableDate, readableTime, toTitleCase, studentProgram, studentYearLevel } from "@/others/function"
import ProfilePic from "../other/profile-pic"

const IncidentReportList = ({ list }) => {
    // { data: [...] }, every row (the table paginates in the browser); null
    // while it loads.
    const rows = (list?.data ?? []).map((e, index) => ({
        id: e.id ?? `row-${index}`,
        index: index + 1,
        student_id: e.user?.id_number,
        student: e.user,
        complaint: e.complaint,
    }))

    const columns = [
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
                    ? studentProgram(student)
                    : student?.teaching?.program?.code
                const roleDetail = isStudent
                    ? studentYearLevel(student)
                    : (student?.role === "program_head" ? "Program Head" : "Faculty")

                return (
                    <div className="flex items-center gap-3 h-full">
                        <ProfilePic
                            size={2}
                            src={getProfilePic(student?.profile?.profile_picture, student?.profile?.sex)}
                        />
                        <div className="flex flex-col justify-center leading-tight">
                            <p className="font-semibold text-[0.9em]">
                                {toTitleCase(
                                    `${student?.profile?.first_name || ""} ${student?.profile?.last_name || ""}`
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
                <span className="line-clamp-2">
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
                <span className="whitespace-nowrap">
                    {params.value
                        ? `${readableDate(params.value)} (${readableTime(params.value)})`
                        : "-"}
                </span>
            ),
        },
    ]

    return (
        <div className="w-full">
            <Box
                sx={{
                    width: "100%",
                    minWidth: 0,
                    overflow: "auto",
                    "& .MuiDataGrid-cell": {
                        alignItems: "center",
                    },
                }}
            >
                <DataGrid
                    rows={rows}
                    columns={columns}
                    disableRowSelectionOnClick
                    hideFooterSelectedRowCount
                    loading={list == null}
                    pagination
                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                    pageSizeOptions={[10, 20, 50, 100]}
                    localeText={{ noRowsLabel: "No Reports Found" }}
                    showToolbar
                />
            </Box>
        </div>
    )
}

export default IncidentReportList
