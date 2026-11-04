import { useState, useEffect } from "react";
import { SystemService } from "@/others/services/system-service";
import { Database, Cpu, HardDrive, MemoryStick, Server, ListTodo, RefreshCw } from "lucide-react";

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

// Usage level → bar color and status label.
const usageLevel = (percent) =>
    percent >= 90
        ? { bar: "bg-red-500", chip: "bg-red-50 text-red-700", label: "Critical" }
        : percent >= 70
            ? { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700", label: "High" }
            : { bar: "bg-green-500", chip: "bg-green-50 text-green-700", label: "Healthy" };

// Moved here from the System Maintenance page's own "System Info" tab so it
// can also be shown on the super admin's dashboard — same
// SystemService.getSystemInfo() call either way.
const SystemInfoPanel = () => {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = () => {
        setRefreshing(true);
        SystemService.getSystemInfo((res) => {
            setInfo(res);
            setLoading(false);
            setRefreshing(false);
        });
    };

    useEffect(load, []);

    if (loading) {
        return (
            <div className="grid gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg h-[9.5rem] animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg h-[13rem] animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!info) {
        return <p className="text-[0.85em] text-gray-500">Failed to load system information.</p>;
    }

    const diskPct = info.disk.total ? Math.round((info.disk.used / info.disk.total) * 100) : null;
    const memPct = info.memory.available && info.memory.total ? Math.round((info.memory.used / info.memory.total) * 100) : null;

    return (
        <div className="grid gap-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.85em] text-gray-500">
                    As of <span className="text-gray-700">{info.server_time}</span> ({info.timezone})
                </p>
                <button
                    type="button"
                    onClick={load}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-1.5 text-[0.85em] rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <UsageCard icon={HardDrive} title="Disk Storage" used={info.disk.used} total={info.disk.total} percent={diskPct} />
                <UsageCard
                    icon={MemoryStick}
                    title="RAM"
                    used={info.memory.used}
                    total={info.memory.total}
                    percent={memPct}
                    unavailable={!info.memory.available}
                    unavailableReason={info.memory.reason}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <DetailsCard
                    icon={Cpu}
                    title="Application"
                    rows={[
                        { label: "PHP Version", value: info.php_version },
                        { label: "Laravel Version", value: info.laravel_version },
                        { label: "PHP Memory Limit", value: info.memory_limit },
                        {
                            label: "Environment",
                            value: (
                                <span className={`px-2 py-0.5 rounded-full text-[0.85em] font-semibold capitalize ${
                                    info.app_env === "production" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                }`}>
                                    {info.app_env || "N/A"}
                                </span>
                            ),
                        },
                    ]}
                />
                <DetailsCard
                    icon={Server}
                    title="Server"
                    rows={[
                        { label: "Operating System", value: info.server_os },
                        { label: "Database", value: `${info.database.connection} ${info.database.version ?? ""}`.trim() },
                        { label: "Database Size", value: info.database.size ? formatBytes(Number(info.database.size)) : "N/A" },
                        { label: "Timezone", value: info.timezone },
                    ]}
                />
            </div>

            {info.queues?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 grid gap-4 min-w-0">
                    <CardTitle icon={ListTodo} title="Queued Jobs" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {info.queues.map((q) => (
                            <div key={q.name} className="rounded-md bg-gray-50 px-4 py-3 min-w-0">
                                <div className="text-[0.75em] text-gray-500 truncate" title={q.name}>{q.name}</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-gray-800 text-lg">{q.pending}</span>
                                    <span className="text-[0.75em] text-gray-500">pending</span>
                                </div>
                                {q.failed > 0 && (
                                    <div className="text-[0.75em] text-red-600 font-medium">{q.failed} failed</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CardTitle = ({ icon: Icon, title, aside }) => (
    <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
                <Icon size={17} />
            </div>
            <div className="font-semibold text-gray-800">{title}</div>
        </div>
        {aside}
    </div>
);

// Label/value rows, so long values (OS, database version) wrap instead of
// being cut off in a narrow card.
const DetailsCard = ({ icon, title, rows }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-5 grid gap-3 content-start min-w-0">
        <CardTitle icon={icon} title={title} />
        <dl className="divide-y divide-gray-100">
            {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-[0.9em]">
                    <dt className="text-gray-500 flex-shrink-0">{r.label}</dt>
                    <dd className="font-medium text-gray-800 text-right break-words min-w-0">{r.value || "N/A"}</dd>
                </div>
            ))}
        </dl>
    </div>
);

const UsageCard = ({ icon, title, used, total, percent, unavailable, unavailableReason }) => {
    const level = usageLevel(percent ?? 0);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5 grid gap-4 content-start min-w-0">
            <CardTitle
                icon={icon}
                title={title}
                aside={!unavailable && (
                    <span className={`px-2 py-0.5 rounded-full text-[0.75em] font-semibold ${level.chip}`}>{level.label}</span>
                )}
            />
            {unavailable ? (
                <div>
                    <p className="text-[0.85em] text-gray-500">Not available on this server.</p>
                    {unavailableReason && (
                        <p className="text-[0.75em] text-gray-400 mt-1">{unavailableReason}</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <span className="text-3xl font-bold text-gray-800">{percent ?? 0}%</span>
                            <span className="ml-1 text-[0.85em] text-gray-500">used</span>
                        </div>
                        <div className="text-right text-[0.85em] text-gray-500">
                            <span className="font-semibold text-gray-700">{formatBytes(Math.max(total - used, 0))}</span> free
                        </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${percent ?? 0}%` }} />
                    </div>
                    <div className="text-[0.8em] text-gray-500">
                        {formatBytes(used)} of {formatBytes(total)}
                    </div>
                </>
            )}
        </div>
    );
};

export default SystemInfoPanel;
