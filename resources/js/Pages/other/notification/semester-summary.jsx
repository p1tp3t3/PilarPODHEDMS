import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { parseNotifContent, readableDate, readableTime, toTitleCase } from "@/others/function"
import NotifDetailCard from "@/Components/other/notif-detail-card"
import { CalendarClock } from "lucide-react"

const SemesterSummaryNotification = ({ notif }) => {
    useMarkNotificationRead()

    const content = parseNotifContent(notif.content)
    const counts = content.counts || {}
    const entries = Object.entries(counts).filter(([, count]) => count > 0)

    return (
        <NotifDetailCard
            icon={CalendarClock}
            tone="warning"
            title={content.label ? `${content.label} Has Ended` : "Semester Has Ended"}
            timestamp={`${readableDate(notif.created_at)} (${readableTime(notif.created_at)})`}
        >
            <p className="text-[0.9em] text-gray-700 mb-4">
                {content.receiver_notif_message}
            </p>
            {entries.length > 0 && (
                <div className="grid gap-2">
                    {entries.map(([type, count]) => (
                        <div key={type} className="flex justify-between text-[0.85em] border-b border-gray-100 pb-2 last:border-0">
                            <span className="text-gray-600">{toTitleCase(type)}{count === 1 ? "" : "s"} Still Unresolved</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                    ))}
                </div>
            )}
        </NotifDetailCard>
    )
}

SemesterSummaryNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SemesterSummaryNotification
