import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { parseNotifContent, readableDate, readableTime } from "@/others/function"
import NotifDetailCard from "@/Components/other/notif-detail-card"
import { Megaphone } from "lucide-react"

const MaintenanceNoticeNotification = ({ notif }) => {
    useMarkNotificationRead()

    const content = parseNotifContent(notif.content)

    return (
        <NotifDetailCard
            icon={Megaphone}
            tone="warning"
            title="Scheduled Maintenance Notice"
            timestamp={`${readableDate(notif.created_at)} (${readableTime(notif.created_at)})`}
        >
            <div
                className="text-[0.9em] text-gray-700 [&_p]:mb-2 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: content.receiver_notif_message }}
            />
        </NotifDetailCard>
    )
}

MaintenanceNoticeNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default MaintenanceNoticeNotification
