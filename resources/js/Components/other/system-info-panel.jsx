import { useState, useEffect } from "react";
import { SystemService } from "@/others/services/system-service";
import { Database, Cpu, HardDrive, MemoryStick, Server, ListTodo } from "lucide-react";

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

// Moved here from the System Maintenance page's own "System Info" tab so it
// can also be shown on the super admin's dashboard — same
// SystemService.getSystemInfo() call either way.
const SystemInfoPanel = () => {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        SystemService.getSystemInfo((res) => {
            setInfo(res);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-md p-4 h-[4.5rem] animate-pulse" />
                ))}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <InfoCard icon={Cpu} label="PHP Version" value={info.php_version} />
                <InfoCard icon={Server} label="Laravel Version" value={info.laravel_version} />
                <InfoCard icon={Server} label="Server OS" value={info.server_os} />
                <InfoCard icon={Server} label="Environment" value={info.app_env} />
                <InfoCard icon={Database} label="Database" value={`${info.database.connection} ${info.database.version ?? ""}`.trim()} />
                <InfoCard icon={Database} label="Database Size" value={info.database.size ? formatBytes(Number(info.database.size)) : "N/A"} />
                <InfoCard icon={Cpu} label="PHP Memory Limit" value={info.memory_limit} />
                <InfoCard icon={Server} label="Server Time" value={`${info.server_time} (${info.timezone})`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <UsageBar icon={HardDrive} title="Disk Storage" used={info.disk.used} total={info.disk.total} percent={diskPct} />
                <UsageBar
                    icon={MemoryStick}
                    title="RAM"
                    used={info.memory.used}
                    total={info.memory.total}
                    percent={memPct}
                    unavailable={!info.memory.available}
                    unavailableReason={info.memory.reason}
                />
            </div>

            {info.queues?.length > 0 && (
                <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-[0.85em] font-semibold text-gray-700">
                        <ListTodo size={16} /> Queued Jobs
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {info.queues.map((q) => (
                            <div key={q.name} className="bg-white border border-gray-200 rounded-md p-4 min-w-0">
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

const InfoCard = ({ icon: Icon, label, value }) => (
    <div className="bg-white border border-gray-200 rounded-md p-4 flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
            <Icon size={16} />
        </div>
        <div className="min-w-0">
            <div className="text-[0.75em] text-gray-500">{label}</div>
            <div className="font-semibold text-gray-800 truncate" title={value || "N/A"}>{value || "N/A"}</div>
        </div>
    </div>
);

const UsageBar = ({ icon: Icon, title, used, total, percent, unavailable, unavailableReason }) => (
    <div className="bg-white border border-gray-200 rounded-md p-5 grid gap-3">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
                <Icon size={16} />
            </div>
            <div className="font-semibold text-gray-800">{title}</div>
        </div>
        {unavailable ? (
            <div>
                <p className="text-[0.85em] text-gray-500">Not available on this server.</p>
                {unavailableReason && (
                    <p className="text-[0.75em] text-gray-400 mt-1">{unavailableReason}</p>
                )}
            </div>
        ) : (
            <>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-blue-600"}`}
                        style={{ width: `${percent ?? 0}%` }}
                    />
                </div>
                <div className="flex justify-between text-[0.8em] text-gray-500">
                    <span>{formatBytes(used)} used ({percent ?? 0}%)</span>
                    <span>{formatBytes(total)} total</span>
                </div>
            </>
        )}
    </div>
);

export default SystemInfoPanel;
