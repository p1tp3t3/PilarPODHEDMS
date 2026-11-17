import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@mui/material";
import { ViewModalSkeleton } from "@/Components/modal/view/view-modal-parts";
import { readableDate, readableTime } from "@/others/function";

// A notification's own page (the bell → one notification): the record it's
// about, in one card. Shared by every page in Pages/shared/notification.
// Minimal header: a soft-tinted icon, the title, nothing else.
const TONE = {
    default: "bg-blue-50 text-blue-500",
    success: "bg-green-50 text-green-500",
    danger: "bg-red-50 text-red-500",
    warning: "bg-amber-50 text-amber-500",
};
const BADGE = {
    default: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
};

// When the notification arrived (the page's `notif`), unless a page gives its own.
const useReceivedAt = () => {
    const at = usePage().props.notif?.created_at;
    return at ? `${readableDate(at)} • ${readableTime(at)}` : null;
};

const Shell = ({ children }) => (
    <div className="w-full max-w-3xl mx-auto py-4 sm:py-8">{children}</div>
);

const NotifDetailCard = ({ icon: Icon, tone = "default", title, timestamp, statusBadge, actions, children }) => {
    const t = TONE[tone] ?? TONE.default;
    const received = useReceivedAt();

    return (
        <Shell>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100">
                    {Icon && (
                        <div className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center ${t}`}>
                            <Icon size={16} strokeWidth={2} />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[0.95rem] font-semibold text-gray-800 leading-snug">{title}</h1>
                        {/* Its own timestamp (e.g. a call-in's), else when it arrived. */}
                        {(timestamp || received) && <p className="text-xs text-gray-400">{timestamp || received}</p>}
                    </div>
                    {statusBadge && (
                        <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${BADGE[statusBadge.tone] ?? BADGE.default}`}>
                            {statusBadge.label}
                        </span>
                    )}
                </div>

                {children && <div className="px-3 sm:px-6 py-4 sm:py-5">{children}</div>}

                {actions && (
                    <div className="px-4 sm:px-6 pb-6 pt-1 flex flex-col sm:flex-row gap-3 justify-center">
                        {actions}
                    </div>
                )}
            </div>
        </Shell>
    );
};

export const NotifEmptyState = ({ icon: Icon, message }) => (
    <Shell>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 py-16 px-6 grid place-items-center text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 text-gray-300 grid place-items-center mb-4">
                {Icon ? <Icon size={26} /> : <AlertCircle size={26} />}
            </div>
            <h1 className="text-[1.05em] text-gray-500 font-medium">{message}</h1>
            <p className="text-sm text-gray-400 mt-1">It may have been removed or archived.</p>
        </div>
    </Shell>
);

// While the record loads: the card's shape as a skeleton (no spinner).
export const NotifLoadingState = () => (
    <Shell>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100">
                <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 2, flexShrink: 0 }} />
                <div className="grid">
                    <Skeleton width={144} height={18} />
                    <Skeleton width={96} height={14} />
                </div>
            </div>
            <div className="px-3 sm:px-6 py-4">
                <ViewModalSkeleton />
            </div>
        </div>
    </Shell>
);

/**
 * The record a notification page shows, fetched by its id from the URL
 * (?complaint_id=, ?referral_id= ...): null while loading, '' when none.
 * Fetched again (skeleton first) whenever another notification is opened
 * on the same page.
 *   const data = useNotifRecord("complaint_id", ComplaintService.getComplaintInfo)
 */
export const useNotifRecord = (param, load) => {
    const { url } = usePage();
    const [data, setData] = useState(null);
    const id = new URLSearchParams(url.split("?")[1] ?? "").get(param);
    useEffect(() => {
        let current = true;
        setData(null);
        load(id, (value) => current && setData(value));
        return () => { current = false };
    }, [id]);
    return data;
};

export default NotifDetailCard;
