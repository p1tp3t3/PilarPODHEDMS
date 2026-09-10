import { Skeleton } from "@mui/material";

/**
 * Loading placeholder for BehaviourAnalysis (student-violation.jsx), shaped
 * like the actual risk-card + timeline content it stands in for, rather than
 * a generic spinner — CircleReload stays reserved for buttons/modals/the
 * full-page Reload overlay (see ListSkeleton's convention).
 */
const BehaviourAnalysisSkeleton = () => {
    return (
        <div className="grid gap-6">
            <div className="border rounded-xl p-6 bg-gray-50 border-gray-200">
                <div className="flex items-start gap-4">
                    <Skeleton variant="circular" width={64} height={64} className="shrink-0" />
                    <div className="w-full space-y-2">
                        <Skeleton variant="text" width="40%" height={28} />
                        <Skeleton variant="text" width="70%" height={20} />

                        <div className="pt-3 space-y-2">
                            <Skeleton variant="text" width="35%" height={16} />
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} variant="text" width={`${80 - i * 10}%`} height={18} />
                            ))}
                        </div>

                        <div className="pt-3 space-y-2">
                            <Skeleton variant="text" width="35%" height={16} />
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} variant="text" width={`${75 - i * 10}%`} height={18} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-md p-6 bg-white shadow-black/20 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={140} height={22} />
                    </div>
                    <Skeleton variant="rounded" width={80} height={22} />
                </div>

                <div className="space-y-6 pl-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton variant="text" width="30%" height={16} />
                            <Skeleton variant="text" width="20%" height={16} />
                            <Skeleton variant="text" width="60%" height={16} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BehaviourAnalysisSkeleton;
