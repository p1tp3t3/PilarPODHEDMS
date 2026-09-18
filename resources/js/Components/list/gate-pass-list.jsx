import { DataGrid } from '@/Components/other/data-grid'
import { getProfilePic, readableDate, readableTime, showUserType, formatSchoolYearSemester } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import ActionBtn from "../button/action-btn"
import Box from '@mui/material/Box'

const GatePassList = (props) => {

    const rows = props.list.length !== 0
        ? props.list.map((e, i) => ({
            id: e.gatepass?.[0]?.id ?? i,
            index: i + 1,
            fullName: `${e.profile?.first_name || ""} ${e.profile?.last_name || ""}`,
            userType: showUserType(e),
            profile_picture: e.profile?.profile_picture,
            sex: e.profile?.sex,
            requested: e.gatepass?.[0]?.created_at,
            confirmed: e.gatepass?.[0]?.confirmed_at,
            expiration: e.gatepass?.[0]?.date_expiration,
            archived_at: e.gatepass?.[0]?.archived_at,
            school_year_semester: e.gatepass?.[0]?.school_year_semester,
            confirmed_school_year_semester: e.gatepass?.[0]?.confirmed_school_year_semester,
        }))
        : []

    const columns = [
        {
            field: 'index',
            headerName: '#',
            width: 70,
        },
        {
            field: 'user',
            headerName: 'User',
            flex: 1.2,
            renderCell: (params) => (
                <div className="flex gap-2 items-center">
                    <ProfilePic
                        size={1.8}
                        src={getProfilePic(params.row.profile_picture, params.row.sex)}
                    />
                    <div>
                        <div className="text-[0.9em] font-semibold">
                            {params.row.fullName}
                        </div>
                        <div className="text-[0.7em] text-gray-600">
                            {params.row.userType}
                        </div>
                    </div>
                </div>
            )
        },
        {
            field: 'requested',
            headerName: 'Requested Since',
            flex: 1,
            renderCell: (params) => (
                <div className="leading-tight py-2">
                    <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : '-'}</div>
                    {formatSchoolYearSemester(params.row.school_year_semester) && (
                        <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.school_year_semester)}</div>
                    )}
                </div>
            )
        },
        {
            field: 'confirmed',
            headerName: 'Confirmed Since',
            flex: 1,
            renderCell: (params) => (
                <div className="leading-tight py-2">
                    <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : '-'}</div>
                    {formatSchoolYearSemester(params.row.confirmed_school_year_semester) && (
                        <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.confirmed_school_year_semester)}</div>
                    )}
                </div>
            )
        },
        {
            field: 'expiration',
            headerName: 'Expiration',
            flex: 1,
            renderCell: (params) =>
                params.value
                    ? `${readableDate(params.value)} (${readableTime(params.value)})`
                    : '-'
        },
        {
            field: 'action',
            headerName: 'Action',
            sortable: false,
            width: 220,
            renderCell: (params) => (
                <div className="flex gap-2 items-center h-full">
                    <ActionBtn
                        className="bg-blue-700 hover:bg-blue-800"
                        onClick={() => props.view(params.row.id)}
                    >
                        View
                    </ActionBtn>

                    {props.events && !params.row.archived_at && (
                        <ActionBtn
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => props.events(params.row.id, "archive")}
                        >
                            Archive
                        </ActionBtn>
                    )}
                </div>
            )
        }
    ]

    return (
        <Box
            sx={{
                width: '100%',
                minWidth: 0,
                overflow: 'hidden',
                backgroundColor: '#fff',
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
                    pagination: { paginationModel: { pageSize: 5, page: 0 } }
                }}
                pagination
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                showToolbar
                localeText={{ noRowsLabel: 'No Gate Pass Records Found' }}
                sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f9fafb',
                        fontWeight: 'bold'
                    }
                }}
            />
        </Box>
    )
}

export default GatePassList