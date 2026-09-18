import AuthLayout from "@/Layouts/auth-layout";
import PageLayout from "@/Layouts/page-layout";
import { useState, useEffect } from "react";
import Switch from "@/Components/button/switch-btn";
import ActionBtn from "@/Components/button/action-btn";
import { useReload } from "@/context-provider/reload-provider";
import { SystemService } from "@/others/services/system-service";
import { Broadcast } from "@/others/classes/broadcast-cofiguration";
import { readableDate, readableTime, showOutputModal, showWarningModal } from "@/others/function";
import TabSwitcher from "@/Components/other/tab-switcher";
import { DataGrid } from "@/Components/other/data-grid";
import Box from "@mui/material/Box";
import { Database, Folder, Archive } from "lucide-react";

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

    const { loadRegister } = useReload();

    useEffect(() => {
        new Broadcast(
            'public',
            'maintenance',
            'MaintenanceModeToggled',
            (e) => setMaintenanceMode(!!e.enabled)
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
                setTogglingMode(false);
            },
            () => setTogglingMode(false)
        );
    };

    return (
        <>
        <PageLayout title="System Maintenance">
                {/* Tabs */}
                <TabSwitcher
                    tabs={[
                        { key: "maintenance_mode", label: "Maintenance Mode" },
                        { key: "backup", label: "Backup" },
                    ]}
                    value={activeTab}
                    onChange={setActiveTab}
                />

                <div className="py-6 sm:py-10 min-w-0">
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

    const deleteBackup = (name) => {
        showWarningModal(
            `Are You Sure You Want To Delete "${name}"?`,
            "Delete Backup",
            "Cancel",
            () => {
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
        <div className="grid gap-5 min-w-0">
            {/* Sub Tabs */}
            <div className="flex flex-wrap gap-2">
                <button
                    className={`px-3 py-1.5 rounded-full text-[0.85em] border ${
                        tab === "create"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setTab("create")}
                >
                    Create Backup
                </button>
                <button
                    className={`px-3 py-1.5 rounded-full text-[0.85em] border ${
                        tab === "history"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setTab("history")}
                >
                    Backup History
                </button>
            </div>

            {tab === "create" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <BackupCard
                        icon={Database}
                        title="Database"
                        description="Export a full SQL dump of the database."
                        buttonLabel="Backup Database"
                        loading={creating === "database"}
                        disabled={!!creating}
                        onClick={() => createBackup("database", "/maintenance/backups/database", "Database")}
                    />
                    <BackupCard
                        icon={Folder}
                        title="Storage"
                        description="Zip all uploaded files (profile pictures, evidence, documents)."
                        buttonLabel="Backup Storage"
                        loading={creating === "storage"}
                        disabled={!!creating}
                        onClick={() => createBackup("storage", "/maintenance/backups/storage", "Storage")}
                    />
                    <BackupCard
                        icon={Archive}
                        title="Full System"
                        description="Database and storage combined into a single archive."
                        buttonLabel="Full System Backup"
                        loading={creating === "full"}
                        disabled={!!creating}
                        onClick={() => createBackup("full", "/maintenance/backups/full", "Full System")}
                    />
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
                                        width: 220,
                                        renderCell: (params) => (
                                            <div className="flex gap-2">
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

const BackupCard = ({ icon: Icon, title, description, buttonLabel, loading, disabled, onClick }) => (
    <div className="bg-white border border-gray-200 rounded-md p-5 grid gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 grid place-items-center text-lg">
            <Icon size={18} />
        </div>
        <div>
            <div className="font-semibold text-gray-800">{title}</div>
            <p className="text-[0.85em] text-gray-500">{description}</p>
        </div>
        <ActionBtn
            className={`bg-blue-600 hover:bg-blue-700 justify-self-start ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={disabled ? () => {} : onClick}
        >
            {loading ? "Creating..." : buttonLabel}
        </ActionBtn>
    </div>
);

SystemMaintenance.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SystemMaintenance;
