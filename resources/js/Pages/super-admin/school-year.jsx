import { useState } from "react"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import SetSemesterDatesModal from "@/Components/modal/submission-form/set-semester-dates-modal"
import { useReload } from "@/context-provider/reload-provider"
import { readableDate, readableTime } from "@/others/function"
import { SchoolYearService } from "@/others/services/school-year-service"
import { DataGrid } from "@/Components/other/data-grid"
import { Box } from "@mui/material"
import { CalendarRange, CalendarClock, Pencil } from "lucide-react"
import { Head, router } from "@inertiajs/react"

function CustomNoRowsOverlay() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        fontSize: "0.9em",
        color: "#555",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: "3em" }}>
        <CalendarRange size="1em" />
      </div>
      <div>No school years found</div>
      <div style={{ fontSize: "0.8em", marginTop: 4 }}>
        Add one to get started
      </div>
    </Box>
  );
}

// Computed on the backend (SchoolYearSemester::current()) so the gap
// rules between semesters live in one place.
const isSchoolYearCurrent = (row) => !!row.is_current

// The next school year isn't stored until the current one ends — it's
// shown here as a preview, then added automatically (scheduled job, or on
// this page's next load) the day after the current school year's last day.
const UpcomingSchoolYear = ({ upcoming }) => {
    if (!upcoming) return null
    const addsToday = upcoming.adds_on <= new Date().toISOString().slice(0, 10)
    return (
        <div className="w-full rounded-md border border-dashed border-blue-300 bg-blue-50/60 p-4 sm:p-5 grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-blue-600" />
                    <h2 className="font-bold text-[1em] text-blue-900">Upcoming School Year · SY {upcoming.year}</h2>
                </div>
                <span className="text-[0.7em] font-semibold uppercase tracking-wide rounded-full bg-white border border-blue-200 text-blue-700 px-2.5 py-1">
                    Not added yet
                </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
                {upcoming.semesters.map((s) => (
                    <div key={s.semester} className="rounded-md bg-white border border-blue-100 px-3 py-2 text-[0.8em]">
                        <span className="font-semibold text-gray-700">{s.semester === 1 ? "1st Sem" : "2nd Sem"}</span>
                        <span className="text-gray-500"> · {readableDate(s.date_start)} - {readableDate(s.date_end)}</span>
                    </div>
                ))}
            </div>
            <p className="text-[0.8em] text-blue-900">
                {addsToday
                    ? "This school year will be added automatically today."
                    : <>Added automatically on <b>{readableDate(upcoming.adds_on)}</b>{upcoming.after_year ? <>, after SY {upcoming.after_year} ends</> : null}. Its semester dates can be adjusted once it's added.</>}
            </p>
        </div>
    )
}

const ITRCSchoolYear = (props) => {
    const [editSemester, openEditSemester] = useState(false)
    const [semesterToEdit, setSemesterToEdit] = useState(null)
    const [siblingSemester, setSiblingSemester] = useState(null)
    const [school_year_list, setSchoolYearListState] = useState(props.school_years)
    // Editing/deleting the latest school year moves the upcoming one's dates.
    const setSchoolYearList = (list) => {
        setSchoolYearListState(list)
        router.reload({ only: ["upcoming"] })
    }
    const { loadRegister } = useReload()

    const openSemesterDates = (semesterRow, allSemesters) => {
        setSemesterToEdit(semesterRow)
        setSiblingSemester((allSemesters ?? []).find((s) => s.id !== semesterRow.id) ?? null)
        openEditSemester(true)
    }

    const columns = [
        {
            field: "index",
            headerName: "#",
            width: 60,
            sortable: false,
            renderCell: (params) => `${params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}.`,
        },
        {
            field: "year",
            headerName: "School Year",
            flex: 1,
            minWidth: 180,
            sortable: false,
        },
        {
            field: "activate",
            headerName: "Status",
            width: 120,
            sortable: false,
            renderCell: ({ row }) => (
                <span className={`font-semibold ${isSchoolYearCurrent(row) ? "text-green-600" : "text-gray-500"}`}>
                    {isSchoolYearCurrent(row) ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            field: "semesters",
            headerName: "Semester Dates",
            width: 300,
            sortable: false,
            renderCell: ({ row }) => {
                return (
                    <div className="flex flex-col justify-center h-full gap-1 py-1">
                        {(row.semesters ?? []).map((s) => {
                            const start = (s.date_start || "").slice(0, 10)
                            const end = (s.date_end || "").slice(0, 10)
                            const isCurrent = !!s.is_current
                            return (
                                <div key={s.id} className="flex items-center gap-2">
                                    <span className={`text-[0.75em] font-semibold w-[3.5rem] ${isCurrent ? "text-blue-600" : "text-gray-500"}`}>
                                        {s.semester === 1 ? "1st Sem" : "2nd Sem"}
                                    </span>
                                    <span className={`text-[0.75em] ${isCurrent ? "text-blue-600 font-semibold" : "text-gray-500"}`}>
                                        {start && end ? `${readableDate(start)} - ${readableDate(end)}` : "Not set"}
                                    </span>
                                    <button
                                        type="button"
                                        title={`Edit ${s.semester === 1 ? "1st" : "2nd"} Semester dates`}
                                        onClick={() => openSemesterDates(s, row.semesters)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )
            },
        },
        {
            field: "created_at",
            headerName: "Added Since",
            width: 200,
            sortable: false,
            renderCell: (params) => `${readableDate(params.row.created_at)} (${readableTime(params.row.created_at)})`,
        },
    ]

    return (
        <>
            <Head title="School Year" />
            <SetSemesterDatesModal
                close={editSemester}
                closeModal={openEditSemester}
                semester={semesterToEdit}
                siblingSemester={siblingSemester}
                reload={loadRegister}
                setter={setSchoolYearList}
            />
            <PageLayout title="School Year Management">
                        <UpcomingSchoolYear upcoming={props.upcoming} />
                        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
                            <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", px: 2.5, py: 1.5 }}>
                                <DataGrid
                                    rows={school_year_list}
                                    getRowId={(row) => row.id}
                                    columns={columns}
                                    pagination
                                    disableRowSelectionOnClick
                                    hideFooterSelectedRowCount
                                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                                    pageSizeOptions={[20, 50, 100]}
                                    showToolbar
                                    components={{
                                        NoRowsOverlay: CustomNoRowsOverlay,
                                    }}
                                />
                            </Box>
                        </div>
            </PageLayout>
        </>
    )
}

ITRCSchoolYear.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ITRCSchoolYear
