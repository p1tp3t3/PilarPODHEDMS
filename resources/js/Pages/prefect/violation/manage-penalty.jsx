import { ViolationService } from "@/others/services/violation-service";
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function";
import ActionBtn from "@/Components/button/action-btn";
import { DataGrid } from "@/Components/other/data-grid";
import { Box, Stack, Typography } from "@mui/material";
import Btn from "@/Components/button/normal-btn";
import { Plus } from "lucide-react";

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
        <Box sx={{ minWidth: 0 }}>
            <Stack sx={{ gap: 2.5, minWidth: 0 }}>
                {canAdd && (
                    <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                        <Btn onclick={() => events[0]('penalty', 'add')} icon={<Plus size={18} />} label="Add Penalty">
                            <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Plus size={16} /> Add Penalty</Stack>
                        </Btn>
                    </Stack>
                )}

                        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                            <DataGrid
                                rows={list ?? []}
                                loading={list == null}
                                getRowId={(row) => row.id}
                                disableRowSelectionOnClick
                                showToolbar
                                hideFooterSelectedRowCount
                                pagination
                                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                                pageSizeOptions={[20, 50, 100]}
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
                                        // The handbook reference (e.g. 5.3), sortable numerically.
                                        field: "ref_number",
                                        headerName: "Ref No.",
                                        width: 100,
                                        type: "number",
                                        align: "left",
                                        headerAlign: "left",
                                        valueGetter: (value) => (value === null || value === undefined || value === "" ? null : Number(value)),
                                        renderCell: ({ row }) => (
                                            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{row.ref_number ?? "—"}</Typography>
                                        ),
                                    },
                                    {
                                        field: "description",
                                        headerName: "Penalty Name",
                                        flex: 1,
                                        minWidth: 220,
                                        renderCell: ({ row }) => (
                                            <Typography sx={{ fontSize: "0.875rem", whiteSpace: "normal" }}>{toTitleCase(row.description)}</Typography>
                                        ),
                                    },
                                    {
                                        field: "created_at",
                                        headerName: "Added Since",
                                        width: 190,
                                        renderCell: ({ row }) => (
                                            <Stack sx={{ lineHeight: 1.3 }}>
                                                <Typography sx={{ fontSize: "0.85rem" }}>{readableDate(row.created_at)}</Typography>
                                                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{readableTime(row.created_at)}</Typography>
                                            </Stack>
                                        ),
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
            </Stack>
        </Box>
    )
}

export default ManagePenalty
