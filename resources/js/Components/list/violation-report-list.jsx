import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { getProfilePic, getYearLevel, readableDate, readableTime, toTitleCase } from "@/others/function"
import ProfilePic from "../other/profile-pic"

const ViolationReportList = ({ list = [] }) => {
    const rows = list.map((e, i) => ({
        id: e.id ?? i,
        index: i + 1,
        student_id: e.user.id_number,
        student: e.student ?? e.user ?? null,
        violation: e.violation?.violation_name,
        status: e.violation?.offense_status == 1 ? 'Major' : 'Minor',
        issued_at: `${readableDate(e.complaint?.offense_issued_at)} (${readableTime(e.complaint?.offense_issued_at)})`,
    }))

    const columns = [
        {
            field: "index",
            headerName: "#",
            width: 70,
            sortable: false,
        },
        {
            field: "student_id",
            headerName: "Student I.D",
            width: 100,
            sortable: false,
        },
        {
            field: "student_col",
            headerName: "Student",
            flex: 1.4,
            sortable: false,
            renderCell: (params) => {
                const student = params.row.student

                if (!student) return "-"

                const isStudent = student.role === "student"
                const latestEnrollment = student.enrollments?.[student.enrollments.length - 1]
                const programName = isStudent
                    ? student.program?.name
                    : student.teaching_staff?.program?.name
                const roleDetail = isStudent
                    ? (latestEnrollment?.year_level ? getYearLevel(latestEnrollment.year_level) : null)
                    : (student.teaching_staff?.position === "program_head" ? "Program Head" : "Faculty")

                return (
                    <div className="flex items-center gap-3 h-full">
                        <ProfilePic
                            size={2}
                            src={getProfilePic(student.profile?.profile_picture, student.profile?.sex)}
                        />
                        <div className="flex flex-col justify-center leading-tight">
                            <div className="text-[0.9em] font-semibold">
                                {`${student.profile?.first_name ?? ""} ${student.profile?.last_name ?? ""}`}
                            </div>
                            <div className="text-[0.75em] text-gray-600">
                                {[programName, roleDetail].filter(Boolean).join(" · ") || "-"}
                            </div>
                        </div>
                    </div>
                )
            },
        },
        {
            field: "violation",
            headerName: "Violation",
            flex: 1.2,
        },
        {
            field: "status",
            headerName: "Status",
            flex: 0.9,
            renderCell: (params) => {
                const status = params.value

                const statusClass =
                    params.value === "Major"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"

                return (
                    <span className={`px-2 py-1 rounded-full text-[0.75em] font-semibold ${statusClass}`}>
                        {status}
                    </span>
                )
            },
        },
        {
            field: "issued_at",
            headerName: "Offense Issued At",
            flex: 1.1,
            renderCell: (params) =>
                params.value ? (
                    <div className="text-[0.8em]">
                        {readableDate(params.value)} ({readableTime(params.value)})
                    </div>
                ) : (
                    "-"
                ),
        },
    ]

    if (!list) {
        return (
            <div className="w-full px-5 py-10 bg-white rounded-md shadow-black/20 shadow-sm text-center">
                Loading...
            </div>
        )
    }

    return (
        <Box
            sx={{
                width: "100%",
                minWidth: 0,
                overflow: "auto",
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
                    pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                    },
                }}
                pagination
                disableRowSelectionOnClick
                sx={{
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                        backgroundColor: "#f9fafb",
                        fontWeight: "bold",
                    },
                }}
                localeText={{ noRowsLabel: "No Violation Reports Found" }}
                showToolbar
            />
        </Box>
    )
}

export default ViolationReportList