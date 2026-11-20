import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { parseNotifContent, readableDate, readableTime } from "@/others/function"
import NotifDetailCard from "@/Components/other/notif-detail-card"
import { Megaphone } from "lucide-react"
import { Box } from "@mui/material"
import { Head } from "@inertiajs/react"

const MaintenanceNoticeNotification = ({ notif }) => {
    useMarkNotificationRead()

    const content = parseNotifContent(notif.content)

    return (
        <>
            <Head title="Maintenance Notice" />
            <NotifDetailCard
                icon={Megaphone}
                tone="warning"
                title="Scheduled Maintenance Notice"
                timestamp={`${readableDate(notif.created_at)} • ${readableTime(notif.created_at)}`}
            >
                <Box
                    sx={{ fontSize: "0.95rem", color: "text.primary", lineHeight: 1.65, "& p": { m: 0, mb: 1.25 }, "& p:last-child": { mb: 0 } }}
                    dangerouslySetInnerHTML={{ __html: content.receiver_notif_message }}
                />
            </NotifDetailCard>
        </>
    )
}

MaintenanceNoticeNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default MaintenanceNoticeNotification
