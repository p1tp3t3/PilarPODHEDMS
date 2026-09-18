import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { getProfilePic, getYearLevel, readableDate, toTitleCase } from "@/others/function"
import ProfilePic from "../other/profile-pic"

const parseReason = (reason) => {
    try {
        const parsed = JSON.parse(reason)
        return Array.isArray(parsed) ? parsed.join(", ") : reason
    } catch {
        return reason
    }
}

const TardyReportList = ({ list = [] }) => {
    const rows = list.map((e, i) => ({
        id: e.id ?? i,
        index: i + 1,
        student_id: e.user?.id_number,
        student: e.user ?? null,
        reason: parseReason(e.reason),
        date_range: (e.date_from || e.date_to) ? `${readableDate(e.date_from)} - ${readableDate(e.date_to)}` : "-",
        confirmed_at: e.confirmed_at,
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

                const latestEnrollment = student.enrollments?.[student.enrollments.length - 1]
                const programName = student.program?.name
                const yearLevel = latestEnrollment?.year_level ? getYearLevel(latestEnrollment.year_level) : null

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
                                {[programName, yearLevel].filter(Boolean).join(" · ") || "-"}
                            </div>
                        </div>
                    </div>
                )
            },
        },
        {
            field: "reason",
            headerName: "Reason",
            flex: 1.2,
            renderCell: (params) => (
                <span className="text-[0.85em]">{toTitleCase(params.value || "-")}</span>
            ),
        },
        {
            field: "date_range",
            headerName: "Date",
            flex: 1,
        },
        {
            field: "confirmed_at",
            headerName: "Confirmed At",
            flex: 1,
            renderCell: (params) =>
                params.value ? (
                    <div className="text-[0.8em]">{readableDate(params.value)}</div>
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
                localeText={{ noRowsLabel: "No Tardy Records Found" }}
                showToolbar
            />
        </Box>
    )
}

export default TardyReportList
