import CircleReload from "@/Components/reload/circle-reload";
import { AlertCircle } from "lucide-react";

const TONE = {
    default: { bg: "bg-blue-50", text: "text-blue-600" },
    success: { bg: "bg-green-50", text: "text-green-600" },
    danger: { bg: "bg-red-50", text: "text-red-600" },
    warning: { bg: "bg-amber-50", text: "text-amber-600" },
};

const NotifDetailCard = ({ icon: Icon, tone = "default", title, timestamp, statusBadge, actions, children }) => {
    const t = TONE[tone] ?? TONE.default;
    const badgeTone = TONE[statusBadge?.tone] ?? TONE.default;

    return (
        <div className="w-full max-w-2xl mx-auto py-6 sm:py-10">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-start gap-4 px-5 sm:px-7 pt-6 pb-5">
                    {Icon && (
                        <div className={`shrink-0 w-12 h-12 rounded-full grid place-items-center ${t.bg} ${t.text}`}>
                            <Icon size={22} strokeWidth={2} />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[1.1em] font-semibold text-gray-900 leading-snug">{title}</h1>
                        {timestamp && <p className="text-[0.8em] text-gray-400 mt-1">{timestamp}</p>}
                    </div>
                    {statusBadge && (
                        <span className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.78em] font-medium ${badgeTone.bg} ${badgeTone.text}`}>
                            {statusBadge.label}
                        </span>
                    )}
                </div>

                {children && (
                    <div className="border-t border-gray-100 px-5 sm:px-7 py-5">
                        {children}
                    </div>
                )}

                {actions && (
                    <div className="px-5 sm:px-7 pb-6 pt-1 flex flex-col sm:flex-row gap-3 justify-center">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

export const NotifEmptyState = ({ icon: Icon, message }) => (
    <div className="w-full max-w-2xl mx-auto py-6 sm:py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 px-6 grid place-items-center text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 text-gray-300 grid place-items-center mb-4">
                {Icon ? <Icon size={26} /> : <AlertCircle size={26} />}
            </div>
            <h1 className="text-[1.05em] text-gray-500 font-medium">{message}</h1>
        </div>
    </div>
);

export const NotifLoadingState = ({ size = 3 }) => (
    <div className="w-full max-w-2xl mx-auto py-6 sm:py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 grid place-items-center">
            <CircleReload size={size} />
        </div>
    </div>
);

export default NotifDetailCard;
