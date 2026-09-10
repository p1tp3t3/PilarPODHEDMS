import { ViolationService } from "@/others/services/violation-service";
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function";
import ActionBtn from "@/Components/button/action-btn";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";

const ManagePenalty = ({ list, events, reload, setter, canAdd = true, canDelete = true }) => {
    const deletePenalty = (e) => {
        showWarningModal(
            'Are You Sure You Want To Delete ' + e.description + '?',
            'Delete Penalty',
            'Cancel',
            () => {
                reload(true, 'text-wait', 'Deleting Penalty...')
                ViolationService.deletePenalty(
                    e.id,
                    setter,
                    () => {
                        reload(true, 'success', 'Penalty Deleted Successfully')
                    },
                    (err) => {
                        reload(true, 'error', err.response.data.message)
                    }
                )
            }
        )
    };

    return (
        <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="grid gap-5">
                {canAdd && (
                <div className="flex justify-end">
                    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full sm:w-auto" onClick={() => events[0]('penalty', 'add')}>Add Penalty</button>
                </div>
                )}
                {(!canAdd || !canDelete) && (
                    <div className="text-[0.85em] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-2">
                        You need prefect-approved access to add or delete penalties. Request it from the Edit Access tab.
                    </div>
                )}

                <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm overflow-x-auto">
                    <div className="w-full px-5 py-3 min-w-[700px]">
                        <Box sx={{ width: "100%" }}>
                            <DataGrid
                                rows={list ?? []}
                                getRowId={(row) => row.id}
                                disableRowSelectionOnClick
                                showToolbar
                                hideFooterSelectedRowCount
                                pagination
                                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                                pageSizeOptions={[20, 50, 100, 200]}
                                columns={[
                                    {
                                        field: "index",
                                        headerName: "#",
                                        width: 50,
                                        sortable: false,
                                        renderCell: (params) =>
                                            params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
                                    },
                                    {
                                        field: "description",
                                        headerName: "Penalty Name",
                                        flex: 1,
                                        minWidth: 220,
                                        renderCell: ({ row }) => toTitleCase(row.description),
                                    },
                                    {
                                        field: "created_at",
                                        headerName: "Added Since",
                                        width: 190,
                                        renderCell: ({ row }) =>
                                            `${readableDate(row.created_at)} (${readableTime(row.created_at)})`,
                                    },
                                    {
                                        field: "actions",
                                        type: "actions",
                                        headerName: "Action",
                                        width: 120,
                                        sortable: false,
                                        headerAlign: "left",
                                        align: "left",
                                        renderCell: ({ row }) => canDelete ? (
                                            <ActionBtn
                                                className="bg-red-600 hover:bg-red-700"
                                                onClick={() => deletePenalty(row)}
                                            >
                                                Delete
                                            </ActionBtn>
                                        ) : null,
                                    },
                                ]}
                            />
                        </Box>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ManagePenalty
