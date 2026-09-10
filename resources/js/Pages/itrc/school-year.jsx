import { useState } from "react"
import AuthLayout from "@/Layouts/auth-layout"
import Btn from "@/Components/button/normal-btn"
import ActionBtn from "@/Components/button/action-btn"
import SetSchoolYearModal from "@/Components/modal/submission-form/set-school-year-modal"
import { useReload } from "@/context-provider/reload-provider"
import { showWarningModal, readableDate, readableTime } from "@/others/function"
import { SchoolYearService } from "@/others/services/school-year-service"
import { DataGrid } from "@mui/x-data-grid"
import { Box } from "@mui/material"
import { CalendarRange } from "lucide-react"

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
            <div className="grid gap-8">
                <div className="pt-10">
                    <div className="grid w-full gap-3">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-bold text-gray-800">School Year Management</h1>
                            <Btn onclick={() => openAddSchoolYear(true)}>Add School Year</Btn>
                        </div>
                        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm overflow-x-auto">
                            <div className="w-full px-5 py-3 min-w-[800px]">
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
