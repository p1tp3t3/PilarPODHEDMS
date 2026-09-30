import { usePage } from "@inertiajs/react"
import { readableDate, readableTime } from "@/others/function"
import { AlertTriangle } from "lucide-react"

// Reads the shared `maintenance_mode_scheduled_at` prop (HandleInertiaRequests)
// directly, so every dashboard just drops this in — shown to every role
// (unlike the "maintenance is ON" reminder, which only makes sense for a
// super admin, since everyone else gets locked out the moment it flips on).
const MaintenanceScheduleReminder = () => {
    const { props } = usePage()
    const scheduledAt = props.maintenance_mode_scheduled_at

    if (!scheduledAt) return null

    return (
        <div className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 mb-6">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <p className="text-[0.85em] font-semibold text-amber-900">
                Scheduled maintenance will begin on {readableDate(scheduledAt)} ({readableTime(scheduledAt)}).
                The system will be temporarily unavailable starting then.
            </p>
        </div>
    )
}

export default MaintenanceScheduleReminder
