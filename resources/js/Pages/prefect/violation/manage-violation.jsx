import { ViolationService } from "@/others/services/violation-service";
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function";
import ActionBtn from "@/Components/button/action-btn";
import TabSwitcher from "@/Components/other/tab-switcher";
import { useState } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import { Box } from "@mui/material";
import { router } from "@inertiajs/react";
import { ShieldAlert } from "lucide-react";

const ManageViolation = ({ list, events, reload, setter, canAdd = true, canEditRow = true, canDelete = true, canView = true }) => {
    // Active violations by default; archived ones sit in their own tab.
    const [view, setView] = useState("active");
    const all = list ?? [];
    const rows = all.filter((v) => (view === "archived") === !!v.archived_at);

    const deleteViolation = (e) => {
        showWarningModal(
            "Are You Sure You Want To Delete " + e.violation_name + "?",
            "Delete Violation",
            "Cancel",
            () => {
                reload(true, "text-wait", "Deleting Violation...");
                ViolationService.deleteViolation(
                    e.id,
                    setter,
                    () => {
                        reload(true, "success", "Violation Deleted Successfully");
                    },
                    (err) => {
                        reload(true, "error", err.response.data.message);
                    }
                );
            }
        );
    };

    // A violation with records is archived instead of deleted.
    const archiveViolation = (e) => {
        showWarningModal(
            `Archive ${e.violation_name}? It won't be available for new complaints. Its existing records stay, and you can restore it from the Archived tab.`,
            "Archive Violation",
            "Cancel",
            () => {
                reload(true, "text-wait", "Archiving Violation...");
                ViolationService.archiveViolation(
                    e.id,
                    setter,
                    () => reload(true, "success", "Violation Archived"),
                    (err) => reload(true, "error", err.response?.data?.message ?? "Something went wrong.")
                );
            }
        );
    };

    const restoreViolation = (e) => {
        showWarningModal(
            `Restore ${e.violation_name}? It will be available for new complaints again.`,
            "Restore Violation",
            "Cancel",
            () => {
                reload(true, "text-wait", "Restoring Violation...");
                ViolationService.restoreViolation(
                    e.id,
                    setter,
                    () => reload(true, "success", "Violation Restored"),
                    (err) => reload(true, "error", err.response?.data?.message ?? "Something went wrong.")
                );
            }
        );
    };

    return (
        <div className="flex-1 min-w-0 overflow-y-auto">

            {/* Toolbar */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <TabSwitcher value={view} onChange={setView} tabs={[{ key: "active", label: "Active" }, { key: "archived", label: "Archived" }]} />
                {canAdd && (
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full sm:w-auto"
                    onClick={() => events[0]("violation", "add")}
                >
                    Add Violation
                </button>
                )}
            </div>

            {/* DATA TABLE */}
            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
                <div className="w-full px-5 py-3 min-w-0">
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                        <DataGrid
                            rows={rows}
                            getRowId={(row) => row.id}
                            disableRowSelectionOnClick
                            showToolbar
                            hideFooterSelectedRowCount
                            pagination
                            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                            pageSizeOptions={[20, 50, 100]}
                            getRowHeight={() => "auto"}
                            // Phones: each violation collapses to its name and
                            // Major/Minor; tap to drop down the date added
                            // and actions.
                            mobileSummary={(row) => ({
                                name: toTitleCase(row.violation_name),
                                role: `${row.offense_status ? "Major" : "Minor"} offense · ${new Set((row.penalties ?? []).map((p) => p.occurrence)).size} offense level(s)${row.archived_at ? " · Archived" : ""}`,
                                avatar: (
                                    <div className={`h-9 w-9 grid place-items-center rounded-full ${row.offense_status ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                                        <ShieldAlert size={18} />
                                    </div>
                                ),
                                hide: ["violation_name", "offense_status"],
                            })}
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
                                    field: "violation_name",
                                    headerName: "Violation Name",
                                    flex: 1,
                                    minWidth: 220,
                                    renderCell: ({ row }) => (
                                        <div className="py-2 font-semibold">
                                            {toTitleCase(row.violation_name)}
                                        </div>
                                    ),
                                },
                                {
                                    field: "offense_status",
                                    headerName: "Status",
                                    width: 110,
                                    renderCell: ({ row }) => (
                                        <div className="py-2">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    row.offense_status
                                                        ? "bg-red-100 text-red-600"
                                                        : "bg-yellow-100 text-yellow-700"
                                                }`}
                                            >
                                                {row.offense_status ? "Major" : "Minor"}
                                            </span>
                                            {row.archived_at && (
                                                <span className="ml-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                                                    Archived
                                                </span>
                                            )}
                                        </div>
                                    ),
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
                                    width: 240,
                                    sortable: false,
                                    headerAlign: "left",
                                    align: "left",
                                    renderCell: ({ row }) => (
                                        <div className="flex gap-2 items-center h-full py-2">
                                            {canView && (
                                            <ActionBtn
                                                className="bg-blue-600 hover:bg-blue-700"
                                                onClick={() => router.visit(`/violation-management/${row.encrypted_id}/students`)}
                                            >
                                                View
                                            </ActionBtn>
                                            )}
                                            {/* Archived: read-only until restored. */}
                                            {canEditRow && !row.archived_at && (
                                            <ActionBtn
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => events[0]("violation", "edit", row)}
                                            >
                                                Edit
                                            </ActionBtn>
                                            )}
                                            {/* Archived: Restore. With records: Archive. Without: Delete. */}
                                            {canDelete && (row.archived_at ? (
                                            <ActionBtn
                                                className="bg-indigo-600 hover:bg-indigo-700"
                                                onClick={() => restoreViolation(row)}
                                            >
                                                Restore
                                            </ActionBtn>
                                            ) : row.has_records ? (
                                            <ActionBtn
                                                className="bg-amber-600 hover:bg-amber-700"
                                                title="This violation has records, so it can be archived but not deleted."
                                                onClick={() => archiveViolation(row)}
                                            >
                                                Archive
                                            </ActionBtn>
                                            ) : (
                                            <ActionBtn
                                                className="bg-red-600 hover:bg-red-700"
                                                onClick={() => deleteViolation(row)}
                                            >
                                                Delete
                                            </ActionBtn>
                                            ))}
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </Box>
                </div>
            </div>
        </div>
    );
};

export default ManageViolation;
