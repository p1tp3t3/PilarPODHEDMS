import AuthLayout from "@/Layouts/auth-layout";
import PageLayout from "@/Layouts/page-layout";
import { useState, useEffect } from "react";
import Switch from "@/Components/button/switch-btn";
import ActionBtn from "@/Components/button/action-btn";
import Btn from "@/Components/button/normal-btn";
import ScheduleMaintenanceModal from "@/Components/modal/submission-form/schedule-maintenance-modal";
import { useReload } from "@/context-provider/reload-provider";
import { SystemService } from "@/others/services/system-service";
import { Broadcast } from "@/others/classes/broadcast-cofiguration";
import { readableDate, readableTime, showOutputModal, showWarningModal , showLoadingModal , closeLoadingModal } from "@/others/function";
import TabSwitcher from "@/Components/other/tab-switcher";
import { DataGrid } from "@/Components/other/data-grid";
import Box from "@mui/material/Box";
import { Database, Folder, Archive, CalendarClock, RefreshCw, Download, Trash2, Check, History, Info, RotateCcw } from "lucide-react";
import { Head } from "@inertiajs/react";

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const backupTypeLabel = { database: "Database", storage: "Storage", full: "Full System" };

const SystemMaintenance = (props) => {
    const [activeTab, setActiveTab] = useState("maintenance_mode");

    const [maintenanceMode, setMaintenanceMode] = useState(!!props.maintenance_mode),
          [togglingMode, setTogglingMode] = useState(false);

    const [scheduledAt, setScheduledAt] = useState(props.maintenance_mode_scheduled_at || null);
    const [scheduleModal, openScheduleModal] = useState(false);

    const { loadRegister } = useReload();

    useEffect(() => {
        new Broadcast(
            'public',
            'maintenance',
            'MaintenanceModeToggled',
            (e) => {
                setMaintenanceMode(!!e.enabled);
                // Turning it on (whether by hand or once a schedule's time
                // arrives) always clears any pending schedule server-side.
                if (e.enabled) setScheduledAt(null);
            }
        ).configure('maintenance mode status');
    }, []);

    const handleToggleMaintenanceMode = () => {
        if (togglingMode) return;
        setTogglingMode(true);

        const next = !maintenanceMode;
        SystemService.toggleMaintenanceMode(
            next,
            (res) => {
                setMaintenanceMode(!!res.maintenance_mode);
                setScheduledAt(null);
                setTogglingMode(false);
            },
            () => setTogglingMode(false)
        );
    };

    const handleCancelSchedule = () => {
        showWarningModal(
            "Are You Sure You Want To Cancel The Scheduled Maintenance?",
            "Cancel Schedule",
            "Keep It",
            () => {
                showLoadingModal("Cancelling the scheduled maintenance")
                SystemService.cancelScheduledMaintenanceMode(
                    () => { closeLoadingModal(); setScheduledAt(null) },
                    () => showOutputModal("Failed To Cancel The Schedule", "e")
                );
            }
        );
    };

    return (
        <>
        <Head title="System Maintenance" />
        <ScheduleMaintenanceModal
            close={scheduleModal}
            closeModal={openScheduleModal}
            onScheduled={(res) => setScheduledAt(res.maintenance_mode_scheduled_at)}
        />
        <PageLayout title="System Maintenance">
                {/* Tabs */}
                <TabSwitcher
                    tabs={[
                        { key: "maintenance_mode", label: "Maintenance Mode" },
                        { key: "backup", label: "Backup" },
                        { key: "logs", label: "Logs" },
                    ]}
                    value={activeTab}
                    onChange={setActiveTab}
                />

                <div className="pt-4 pb-6 sm:pb-10 min-w-0">
                    {activeTab === "maintenance_mode" && (
                        <div className="grid gap-5">
                            <div className="max-w-[35rem] flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-md px-5 py-4">
                                <div>
                                    <div className="font-semibold text-gray-800">
                                        Maintenance Mode
                                    </div>
                                    <p className="text-[0.85em] text-gray-500">
                                        {maintenanceMode
                                            ? 'The system is currently locked down. Only super admins can sign in.'
                                            : 'The system is accessible to everyone as normal.'}
                                    </p>
                                </div>
                                <Switch
                                    checked={maintenanceMode}
                                    onChange={handleToggleMaintenanceMode}
                                    effect={['bg-gray-300', 'bg-red-600']}
                                />
                            </div>

                            {!maintenanceMode && (
                                <div className="max-w-[35rem] bg-white border border-gray-200 rounded-md px-5 py-4 grid gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
                                            <CalendarClock size={18} />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-800">Schedule Maintenance</div>
                                            <p className="text-[0.85em] text-gray-500">
                                                Pick a start date/time and notify everyone about it in one step.
                                            </p>
                                        </div>
                                    </div>

                                    {scheduledAt ? (
                                        <div className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
                                            <p className="text-[0.85em] text-blue-900">
                                                Scheduled to start on{" "}
                                                <b>{readableDate(scheduledAt)} ({readableTime(scheduledAt)})</b>
                                            </p>
                                            <ActionBtn
                                                className="bg-gray-600 hover:bg-gray-700 flex-shrink-0"
                                                onClick={handleCancelSchedule}
                                            >
                                                Cancel
                                            </ActionBtn>
                                        </div>
                                    ) : (
                                        <div>
                                            <Btn onclick={() => openScheduleModal(true)}>
                                                Schedule Maintenance
                                            </Btn>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="w-full grid gap-2">
                                <div className="text-[0.85em] font-semibold text-gray-700">
                                    Live Preview — what a regular visitor sees right now
                                </div>
                                <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                    <iframe
                                        key={maintenanceMode}
                                        src="/maintenance/preview"
                                        title="Maintenance preview"
                                        className="w-full h-[24rem] border-0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "backup" && (
                        <BackupTab reload={loadRegister} />
                    )}

                    {activeTab === "logs" && (
                        <LogsTab />
                    )}
                </div>
        </PageLayout>
        </>
    );
};

const BackupTab = ({ reload }) => {
    const [tab, setTab] = useState("create");
    const [backups, setBackups] = useState([]);
    const [creating, setCreating] = useState(null);

    const fetchBackups = () => {
        SystemService.getBackups((res) => {
            setBackups(res.backups || []);
        });
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const createBackup = (type, endpoint, label) => {
        if (creating) return;
        setCreating(type);
        reload(true, "text-wait", `Creating ${label} backup. This may take a while`);

        SystemService.createBackup(
            endpoint,
            () => {
                reload(true, "success", `${label} Backup Created Successfully`);
                setCreating(null);
                fetchBackups();
            },
            (err) => {
                reload(true, "error", err?.response?.data?.message || `Failed To Create ${label} Backup`);
                setCreating(null);
            }
        );
    };

    // Newest backup of a type, for the "Last backup" line on each card.
    const lastBackupOf = (type) => backups
        .filter((b) => b.type === type)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    const restoreBackup = (row) => {
        const what = {
            database: "the database",
            storage: "all uploaded and generated files",
            full: "the database and all uploaded and generated files",
        }[row.type] ?? "the system";

        showWarningModal(
            `Restore "${row.name}"? This replaces ${what} with the backup from ${readableDate(row.created_at)}. A backup of the current state is made first.`,
            "Restore Backup",
            "Cancel",
            () => {
                showLoadingModal("Restoring the backup. This may take a while")
                SystemService.restoreBackup(
                    row.name,
                    (res) => {
                        showOutputModal(`Backup Restored Successfully. The previous state was saved as ${res?.safety_backup ?? "a new backup"}.`, "s");
                        fetchBackups();
                    },
                    (err) => showOutputModal(err?.response?.data?.message || "Failed To Restore Backup", "e")
                );
            }
        );
    };

    const deleteBackup = (name) => {
        showWarningModal(
            `Are You Sure You Want To Delete "${name}"?`,
            "Delete Backup",
            "Cancel",
            () => {
                showLoadingModal("Deleting the backup")
                SystemService.deleteBackup(
                    name,
                    () => {
                        showOutputModal("Backup Deleted Successfully", "s");
                        fetchBackups();
                    },
                    () => showOutputModal("Failed To Delete Backup", "e")
                );
            }
        );
    };

    return (
        <div className="grid gap-4 min-w-0">
            {/* Sub Tabs */}
            <TabSwitcher
                tabs={[
                    { key: "create", label: "Create Backup", icon: Archive },
                    { key: "history", label: `Backup History${backups.length ? ` (${backups.length})` : ""}`, icon: History },
                ]}
                value={tab}
                onChange={setTab}
            />

            {tab === "create" && (
                <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <BackupCard
                            icon={Database}
                            title="Database"
                            description="A full SQL dump of the database."
                            includes={["All accounts and profiles", "Cases, forms and records", "System settings"]}
                            lastBackup={lastBackupOf("database")}
                            buttonLabel="Backup Database"
                            loading={creating === "database"}
                            disabled={!!creating}
                            onClick={() => createBackup("database", "/maintenance/backups/database", "Database")}
                        />
                        <BackupCard
                            icon={Folder}
                            title="Storage"
                            description="A zip of every uploaded and generated file."
                            includes={["Profile pictures and logos", "Evidence attachments", "Generated forms and reports"]}
                            lastBackup={lastBackupOf("storage")}
                            buttonLabel="Backup Storage"
                            loading={creating === "storage"}
                            disabled={!!creating}
                            onClick={() => createBackup("storage", "/maintenance/backups/storage", "Storage")}
                        />
                        <BackupCard
                            icon={Archive}
                            title="Full System"
                            description="Database and storage combined into a single archive."
                            includes={["Everything in Database", "Everything in Storage", "One file to restore from"]}
                            lastBackup={lastBackupOf("full")}
                            buttonLabel="Full System Backup"
                            recommended
                            loading={creating === "full"}
                            disabled={!!creating}
                            onClick={() => createBackup("full", "/maintenance/backups/full", "Full System")}
                        />
                    </div>

                    <div className="flex items-start gap-2 text-[0.85em] text-gray-500">
                        <Info size={15} className="mt-0.5 flex-shrink-0" />
                        <p>
                            Backups are kept on the server. Download them from{" "}
                            <button type="button" className="text-blue-600 hover:underline" onClick={() => setTab("history")}>
                                Backup History
                            </button>{" "}
                            to keep a copy somewhere safe.
                        </p>
                    </div>
                </div>
            )}

            {tab === "history" && (
                <div className="bg-white border border-gray-200 rounded-md px-5 py-4 min-w-0">
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", height: 420 }}>
                            <DataGrid
                                rows={backups.map((b, i) => ({ id: i, ...b }))}
                                columns={[
                                    { field: "name", headerName: "Name", flex: 1, minWidth: 220 },
                                    {
                                        field: "type",
                                        headerName: "Type",
                                        width: 130,
                                        renderCell: (params) => backupTypeLabel[params.value] ?? params.value,
                                    },
                                    {
                                        field: "size",
                                        headerName: "Size",
                                        width: 110,
                                        renderCell: (params) => formatBytes(params.value),
                                    },
                                    {
                                        field: "created_at",
                                        headerName: "Created",
                                        width: 190,
                                        renderCell: (params) => (
                                            <span className="text-[0.85em]">
                                                {readableDate(params.value)} ({readableTime(params.value)})
                                            </span>
                                        ),
                                    },
                                    {
                                        field: "actions",
                                        type: "actions",
                                        headerName: "Action",
                                        width: 300,
                                        renderCell: (params) => (
                                            <div className="flex flex-wrap gap-2 py-2">
                                                <ActionBtn
                                                    className="bg-amber-600 hover:bg-amber-700"
                                                    onClick={() => restoreBackup(params.row)}
                                                >
                                                    <RotateCcw size={14} className="inline mr-1" />
                                                    Restore
                                                </ActionBtn>
                                                <a href={`/maintenance/backups/${params.row.name}/download`}>
                                                    <ActionBtn className="bg-green-600 hover:bg-green-700">
                                                        Download
                                                    </ActionBtn>
                                                </a>
                                                <ActionBtn
                                                    className="bg-red-600 hover:bg-red-700"
                                                    onClick={() => deleteBackup(params.row.name)}
                                                >
                                                    Delete
                                                </ActionBtn>
                                            </div>
                                        ),
                                    },
                                ]}
                                hideFooter
                                disableRowSelectionOnClick
                                getRowHeight={() => "auto"}
                                showToolbar
                                localeText={{ noRowsLabel: "No Backups Yet" }}
                            />
                    </Box>
                </div>
            )}
        </div>
    );
};

const BackupCard = ({ icon: Icon, title, description, includes, lastBackup, buttonLabel, recommended, loading, disabled, onClick }) => (
    <div className={`relative flex flex-col bg-white border rounded-lg p-5 ${
        recommended ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"
    }`}>
        {recommended && (
            <span className="absolute top-4 right-4 text-[0.7em] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                Recommended
            </span>
        )}

        <div className={`flex items-center gap-3 ${recommended ? "pr-24" : ""}`}>
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
                <Icon size={20} />
            </div>
            <div className="min-w-0">
                <div className="font-semibold text-gray-800">{title}</div>
                <p className="text-[0.8em] text-gray-500">{description}</p>
            </div>
        </div>

        <ul className="grid gap-1.5 mt-4 text-[0.85em] text-gray-600">
            {includes.map((item) => (
                <li key={item} className="flex items-center gap-2">
                    <Check size={14} className="text-green-600 flex-shrink-0" />
                    {item}
                </li>
            ))}
        </ul>

        <div className="mt-auto pt-5 grid gap-3">
            <div className="border-t border-gray-100 pt-3 text-[0.8em] text-gray-500">
                {lastBackup
                    ? <>Last backup: <span className="text-gray-700">{readableDate(lastBackup.created_at)} ({readableTime(lastBackup.created_at)})</span></>
                    : "No backup yet"}
            </div>
            <ActionBtn
                className="bg-blue-600 hover:bg-blue-700 w-full"
                disabled={disabled}
                onClick={onClick}
            >
                {loading ? "Creating..." : buttonLabel}
            </ActionBtn>
        </div>
    </div>
);

const LogsTab = () => {
    const [content, setContent] = useState("");
    const [size, setSize] = useState(0);
    const [truncated, setTruncated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

    const fetchLogs = () => {
        setLoading(true);
        SystemService.getLogs(
            (res) => {
                setContent(res.content || "");
                setSize(res.size || 0);
                setTruncated(!!res.truncated);
                setLoading(false);
            },
            () => {
                setLoading(false);
                showOutputModal("Failed To Load Logs", "e");
            }
        );
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleClear = () => {
        showWarningModal(
            "Are You Sure You Want To Clear The Log File? This Cannot Be Undone.",
            "Clear Log",
            "Cancel",
            () => {
                setClearing(true);
                showLoadingModal("Clearing the log file");
                SystemService.clearLogs(
                    () => {
                        setClearing(false);
                        closeLoadingModal();
                        fetchLogs();
                    },
                    () => {
                        setClearing(false);
                        showOutputModal("Failed To Clear Log", "e");
                    }
                );
            }
        );
    };

    return (
        <div className="grid gap-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[0.85em] text-gray-500">
                    {size > 0
                        ? `${formatBytes(size)} total${truncated ? " — showing the last ~500 KB" : ""}`
                        : "Log file is empty."}
                </p>
                <div className="flex flex-wrap gap-2">
                    <ActionBtn
                        className="bg-gray-600 hover:bg-gray-700"
                        onClick={fetchLogs}
                    >
                        <RefreshCw size={14} className="inline mr-1" />
                        Refresh
                    </ActionBtn>
                    <a href="/maintenance/logs/download">
                        <ActionBtn className="bg-blue-600 hover:bg-blue-700">
                            <Download size={14} className="inline mr-1" />
                            Download
                        </ActionBtn>
                    </a>
                    <ActionBtn
                        className={`bg-red-600 hover:bg-red-700 ${clearing ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={clearing ? () => {} : handleClear}
                    >
                        <Trash2 size={14} className="inline mr-1" />
                        {clearing ? "Clearing..." : "Clear Log"}
                    </ActionBtn>
                </div>
            </div>

            <div className="bg-gray-900 rounded-md overflow-hidden">
                <pre className="text-[0.8em] text-gray-100 p-4 h-[32rem] overflow-auto whitespace-pre-wrap break-all">
                    {loading ? "Loading..." : (content || "No log entries.")}
                </pre>
            </div>
        </div>
    );
};

SystemMaintenance.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SystemMaintenance;
