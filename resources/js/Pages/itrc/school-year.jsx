import { useState } from "react"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import Btn from "@/Components/button/normal-btn"
import ActionBtn from "@/Components/button/action-btn"
import SetSchoolYearModal from "@/Components/modal/submission-form/set-school-year-modal"
import SetSemesterDatesModal from "@/Components/modal/submission-form/set-semester-dates-modal"
import { useReload } from "@/context-provider/reload-provider"
import { showWarningModal, readableDate, readableTime } from "@/others/function"
import { SchoolYearService } from "@/others/services/school-year-service"
import { DataGrid } from "@/Components/other/data-grid"
import { Box } from "@mui/material"
import { CalendarRange, Pencil } from "lucide-react"

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

const ITRCSchoolYear = (props) => {
    const [addSchoolYear, openAddSchoolYear] = useState(false)
    const [editSemester, openEditSemester] = useState(false)
    const [semesterToEdit, setSemesterToEdit] = useState(null)
    const [siblingSemester, setSiblingSemester] = useState(null)
    const [school_year_list, setSchoolYearList] = useState(props.school_years)
    const { loadRegister } = useReload()

    const activateSchoolYear = (row) => {
        showWarningModal(
            `Are You Sure You Want To Activate School Year ${row.year}?`,
            "Activate School Year",
            "Cancel",
            () => {
                loadRegister(true, "text-wait", "Activating School Year")
                SchoolYearService.activate(
                    row.id,
                    setSchoolYearList,
                    () => loadRegister(true, "success", `School Year ${row.year} Activated Successfully`),
                    (err) => loadRegister(true, "error", err?.response?.data?.message || "Failed to Activate School Year")
                )
            }
        )
    }

    const closeSchoolYear = (row) => {
        showWarningModal(
            `Are You Sure You Want To End School Year ${row.year}? Enrollment records are not affected — you'll need to manually activate the next school year afterward.`,
            "End School Year",
            "Cancel",
            () => {
                loadRegister(true, "text-wait", "Ending School Year")
                SchoolYearService.close(
                    row.id,
                    setSchoolYearList,
                    () => loadRegister(true, "success", `School Year ${row.year} Ended Successfully`),
                    (err) => loadRegister(true, "error", err?.response?.data?.message || "Failed to End School Year")
                )
            }
        )
    }

    const openSemesterDates = (semesterRow, allSemesters) => {
        setSemesterToEdit(semesterRow)
        setSiblingSemester((allSemesters ?? []).find((s) => s.id !== semesterRow.id) ?? null)
        openEditSemester(true)
    }

    const deleteSchoolYear = (row) => {
        showWarningModal(
            `Are You Sure You Want To Delete School Year ${row.year}?`,
            "Delete School Year",
            "Cancel",
            () => {
                loadRegister(true, "text-wait", "Deleting School Year")
                SchoolYearService.delete(
                    row.id,
                    setSchoolYearList,
                    () => loadRegister(true, "success", `School Year ${row.year} Deleted Successfully`),
                    (err) => loadRegister(true, "error", err?.response?.data?.message || "Failed to Delete School Year")
                )
            }
        )
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
                <span className={`font-semibold ${row.activate ? "text-green-600" : "text-gray-500"}`}>
                    {row.activate ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            field: "semesters",
            headerName: "Semester Dates",
            width: 300,
            sortable: false,
            renderCell: ({ row }) => {
                const today = new Date().toISOString().slice(0, 10)
                return (
                    <div className="flex flex-col justify-center h-full gap-1 py-1">
                        {(row.semesters ?? []).map((s) => {
                            const start = (s.date_start || "").slice(0, 10)
                            const end = (s.date_end || "").slice(0, 10)
                            const isCurrent = row.activate && start && end && today >= start && today <= end
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
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 280,
            align: "left",
            headerAlign: "left",
            renderCell: ({ row }) => (
                <div className="flex gap-2 items-center h-full">
                    {row.activate ? (
                        <ActionBtn
                            onClick={() => closeSchoolYear(row)}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            End School Year
                        </ActionBtn>
                    ) : (
                        <ActionBtn
                            onClick={() => activateSchoolYear(row)}
                            className="bg-green-600 text-white hover:bg-green-700"
                        >
                            Activate
                        </ActionBtn>
                    )}
                    <DeleteSchoolYearButton row={row} deleteSchoolYear={deleteSchoolYear} />
                </div>
            ),
        },
    ]

    return (
        <>
            <SetSchoolYearModal
                close={addSchoolYear}
                closeModal={openAddSchoolYear}
                pd={["px-5", "py-7"]}
                isEnableOuterClose={true}
                reload={loadRegister}
                setter={setSchoolYearList}
            />
            <SetSemesterDatesModal
                close={editSemester}
                closeModal={openEditSemester}
                semester={semesterToEdit}
                siblingSemester={siblingSemester}
                reload={loadRegister}
                setter={setSchoolYearList}
            />
            <PageLayout
                title="School Year Management"
                rightSideComponent={<Btn onclick={() => openAddSchoolYear(true)}>Add School Year</Btn>}
            >
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

const DeleteSchoolYearButton = ({ row, deleteSchoolYear }) => {
    const canDelete = !row.activate && !row.enrollments_count

    const title = row.activate
        ? "Activate a different school year before deleting this one"
        : row.enrollments_count
        ? "Students are still enrolled under this school year"
        : "Delete school year"

    return (
        <ActionBtn
            onClick={() => canDelete && deleteSchoolYear(row)}
            disabled={!canDelete}
            title={title}
            className={
                canDelete
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
            }
        >
            Delete
        </ActionBtn>
    )
}

ITRCSchoolYear.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ITRCSchoolYear
