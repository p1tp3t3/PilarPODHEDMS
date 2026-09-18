import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { formatAllowTo, getProfilePic, getYearLevel, readableDate, readableTime } from "@/others/function"
import ProfilePic from "../other/profile-pic"

const GatePassReportList = ({ list = [] }) => {
    const rows = list.map((e, i) => ({
        id: e.id ?? i,
        index: i + 1,
        student_id: e.user?.id_number,
        student: e.user ?? null,
        reason: e.reason,
        allow_to: e.allow_to,
        date_expiration: e.date_expiration,
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
            flex: 1.3,
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
                <span className="text-[0.85em] line-clamp-2">{params.value || "-"}</span>
            ),
        },
        {
            field: "allow_to",
            headerName: "Allow To",
            flex: 1,
            renderCell: (params) => (
                <span className="text-[0.85em] line-clamp-2">{formatAllowTo(params.value) || "-"}</span>
            ),
        },
        {
            field: "date_expiration",
            headerName: "Date Expiration",
            flex: 1,
            renderCell: (params) =>
                params.value ? (
                    <div className="text-[0.8em]">{readableDate(params.value)} ({readableTime(params.value)})</div>
                ) : "-",
        },
        {
            field: "confirmed_at",
            headerName: "Confirmed At",
            flex: 1,
            renderCell: (params) =>
                params.value ? (
                    <div className="text-[0.8em]">{readableDate(params.value)}</div>
                ) : "-",
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
                localeText={{ noRowsLabel: "No Gate Pass Reports Found" }}
                showToolbar
            />
        </Box>
    )
}

export default GatePassReportList
