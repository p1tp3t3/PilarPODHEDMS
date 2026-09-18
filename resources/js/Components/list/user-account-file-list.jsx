import { useState } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import { Box } from "@mui/material";
import ActionBtn from "../button/action-btn";
import AccountFilePreviewModal from "../modal/view/account-file-preview-modal";
import { FileText } from "lucide-react";

const UserAccountFileList = ({ list = null, deleteFile }) => {
    const rows = list ?? [];
    const [previewFile, setPreviewFile] = useState(null);

    const downloadFile = (fileName) => {
        window.open(`/download/user/account/${fileName}`, "_blank");
    };

    const columns = [
        {
            field: "index",
            headerName: "#",
            width: 60,
            sortable: false,
            renderCell: (params) =>
                `${params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}.`,
        },
        {
            field: "name",
            headerName: "File Name",
            flex: 1,
            minWidth: 220,
            renderCell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => setPreviewFile(row.name)}
                    className="flex items-center gap-3 h-full hover:underline"
                >
                    <FileText size="1.1em" className="text-green-600" />
                    <div className="text-[0.8em]">{row.name}</div>
                </button>
            ),
        },
        {
            field: "last_modified",
            headerName: "Last Modified",
            width: 220,
            renderCell: ({ row }) => <span className="text-[0.8em]">{row.last_modified}</span>,
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: deleteFile ? 340 : 240,
            sortable: false,
            headerAlign: "left",
            align: "left",
            renderCell: ({ row }) => (
                <div className="flex flex-wrap gap-2 items-center py-1">
                    <ActionBtn onClick={() => setPreviewFile(row.name)} className="bg-gray-700 text-white hover:bg-gray-800">
                        View
                    </ActionBtn>
                    <ActionBtn onClick={() => downloadFile(row.name)} className="bg-blue-600 text-white hover:bg-blue-700">
                        Download File
                    </ActionBtn>
                    {deleteFile && (
                        <ActionBtn onClick={() => deleteFile(row.name)} className="bg-red-600 text-white hover:bg-red-700">
                            Delete
                        </ActionBtn>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Box className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3" sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
            <AccountFilePreviewModal
                close={previewFile !== null}
                closeModal={() => setPreviewFile(null)}
                fileName={previewFile}
            />
            <DataGrid
                rows={rows}
                getRowId={(row) => row.name}
                disableRowSelectionOnClick
                showToolbar
                hideFooterSelectedRowCount
                pagination
                getRowHeight={() => 'auto'}
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                pageSizeOptions={[20, 50, 100, 200]}
                localeText={{ noRowsLabel: "No Files Uploaded Yet" }}
                sx={{
                    "& .MuiDataGrid-toolbarContainer": {
                        minHeight: "2.75rem",
                        paddingBlock: "0.4rem",
                    },
                }}
                columns={columns}
            />
        </Box>
    );
};

export default UserAccountFileList;
