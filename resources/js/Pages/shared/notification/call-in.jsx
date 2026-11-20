import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { readableDate, readableTime, parseNotifContent } from "@/others/function"
import { PhoneCall } from "lucide-react"
import NotifDetailCard, { NotifSignature } from "@/Components/other/notif-detail-card"
import { Typography } from "@mui/material"
import { Head } from "@inertiajs/react"

const CallInNotification = (props) => {
    useMarkNotificationRead()

    const content = parseNotifContent(props.notif.content);

    return (
        <>
            <Head title="Call-In Notification" />
            <NotifDetailCard
                icon={PhoneCall}
                tone="default"
                title="You Have Been Called In By The Prefect"
                timestamp={`${readableDate(props.notif.created_at)} • ${readableTime(props.notif.created_at)}`}
            >
                <Typography sx={{ fontSize: "0.95rem", color: "text.primary", lineHeight: 1.65 }}>
                    {content.receiver_notif_message}
                </Typography>
                <NotifSignature lines={["Office of the Prefect of Discipline", "Higher Education Department"]} />
            </NotifDetailCard>
        </>
    )
}

CallInNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default CallInNotification
