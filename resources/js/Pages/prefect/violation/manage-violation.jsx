import { ViolationService } from "@/others/services/violation-service";
import StatusPill from "@/Components/list/status-pill"
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function";
import ActionBtn from "@/Components/button/action-btn";
import TabSwitcher from "@/Components/other/tab-switcher";
import { useState } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import { Box, Stack, Typography } from "@mui/material";
import Btn from "@/Components/button/normal-btn";
import { router } from "@inertiajs/react";
import { Plus, ShieldAlert } from "lucide-react";

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
        <Box sx={{ minWidth: 0 }}>

            {/* Toolbar: Active / Archived, and Add Violation. */}
            <Stack direction={{ xs: "column-reverse", sm: "row" }} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", gap: 1.5, mb: 2 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <TabSwitcher value={view} onChange={setView} tabs={[{ key: "active", label: "Active" }, { key: "archived", label: "Archived" }]} />
                </Box>
                {canAdd && (
                    <Btn onclick={() => events[0]("violation", "add")} icon={<Plus size={18} />} label="Add Violation">
                        <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Plus size={16} /> Add Violation</Stack>
                    </Btn>
                )}
            </Stack>

            {/* DATA TABLE */}
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                        <DataGrid
                            rows={rows}
                            loading={list == null}
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
                                    <Box sx={{
                                        width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center",
                                        bgcolor: `var(--tone-${row.offense_status ? "red" : "amber"}-bg)`, color: `var(--tone-${row.offense_status ? "red" : "amber"}-fg)`,
                                    }}>
                                        <ShieldAlert size={18} />
                                    </Box>
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
                                        <Typography sx={{ py: 1, fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4, whiteSpace: "normal" }}>
                                            {toTitleCase(row.violation_name)}
                                        </Typography>
                                    ),
                                },
                                {
                                    field: "offense_status",
                                    headerName: "Status",
                                    width: 110,
                                    renderCell: ({ row }) => (
                                        <Stack direction="row" sx={{ py: 1, flexWrap: "wrap", gap: 0.75 }}>
                                            <StatusPill status={row.offense_status ? "major" : "minor"} />
                                            {row.archived_at && <StatusPill status="archived" />}
                                        </Stack>
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
                                    width: 240,
                                    sortable: false,
                                    headerAlign: "left",
                                    align: "left",
                                    renderCell: ({ row }) => (
                                        <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap", py: 1 }}>
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
                                        </Stack>
                                    ),
                                },
                            ]}
                        />
                    </Box>
        </Box>
    );
};

export default ManageViolation;
