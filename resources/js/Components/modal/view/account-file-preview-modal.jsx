import { useEffect, useState } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import { Box } from "@mui/material";
import UpModal from "../up-modal";
import CircleReload from "@/Components/reload/circle-reload";
import { AccountService } from "@/others/services/account-service";

const COLUMN_ORDER = ["id", "name", "program", "year_level", "username", "password"];
const COLUMN_LABELS = {
    id: "ID Number",
    name: "Name",
    program: "Program",
    year_level: "Year Level",
    username: "Username",
    password: "Default Password",
};

const AccountFilePreviewModal = ({ close, closeModal, fileName }) => {
    const [zipEntries, setZipEntries] = useState(null);
    const [csvRows, setCsvRows] = useState(null);
    const [activeEntry, setActiveEntry] = useState(null);

    useEffect(() => {
        if (close && fileName) {
            setZipEntries(null);
            setCsvRows(null);
            setActiveEntry(null);
            loadFile();
        }
    }, [close, fileName]);

    const loadFile = () => {
        AccountService.previewAccountFile(fileName, (res) => {
            if (res.type === "zip") {
                setZipEntries(res.entries);
            } else {
                setCsvRows(res.rows);
            }
        });
    };

    const loadZipEntry = (entry) => {
        setActiveEntry(entry);
        setCsvRows(null);
        AccountService.previewAccountFileEntry(fileName, entry, (res) => setCsvRows(res.rows));
    };

    const backToZipListing = () => {
        setActiveEntry(null);
        setCsvRows(null);
    };

    const columns = csvRows && csvRows.length > 0
        ? COLUMN_ORDER.filter((key) => key in csvRows[0]).map((key) => ({
            field: key,
            headerName: COLUMN_LABELS[key] ?? key,
            flex: key === "name" ? 1.5 : 1,
            minWidth: 130,
        }))
        : [];

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            isEnableOuterClose={true}
            pd={["px-5", "py-6"]}
            bgColor="bg-white"
            w="w-[95vw] sm:w-[55rem] max-w-[95vw]"
        >
            <div className="w-full grid gap-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-lg sm:text-[1.2em] font-bold break-all">
                        {activeEntry ?? fileName}
                    </h1>
                    {activeEntry && (
                        <button
                            type="button"
                            onClick={backToZipListing}
                            className="text-[0.85em] text-blue-700 hover:underline whitespace-nowrap"
                        >
                            <i className="fa-solid fa-arrow-left"></i> Back to file list
                        </button>
                    )}
                </div>

                {zipEntries && !activeEntry && (
                    <div className="grid gap-2">
                        {zipEntries.length === 0 && (
                            <div className="text-gray-500 text-[0.9em] py-6 text-center">This zip file is empty.</div>
                        )}
                        {zipEntries.map((entry) => (
                            <button
                                key={entry}
                                type="button"
                                onClick={() => loadZipEntry(entry)}
                                className="flex items-center gap-3 px-4 py-3 border rounded-md hover:bg-gray-50 text-left"
                            >
                                <i className="fa-solid fa-file-csv text-green-600"></i>
                                <span className="text-[0.85em]">{entry}</span>
                            </button>
                        ))}
                    </div>
                )}

                {(csvRows || (zipEntries && activeEntry)) && (
                    csvRows ? (
                        <Box sx={{ width: "100%" }}>
                            <DataGrid
                                rows={csvRows.map((row, i) => ({ id: i, ...row }))}
                                columns={columns}
                                disableRowSelectionOnClick
                                hideFooterSelectedRowCount
                                pagination
                                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                                pageSizeOptions={[10, 25, 50]}
                                autoHeight
                            />
                        </Box>
                    ) : (
                        <div className="w-full flex justify-center py-10">
                            <CircleReload size={2.5} />
                        </div>
                    )
                )}

                {!zipEntries && !csvRows && (
                    <div className="w-full flex justify-center py-10">
                        <CircleReload size={2.5} />
                    </div>
                )}
            </div>
        </UpModal>
    );
};

export default AccountFilePreviewModal;
