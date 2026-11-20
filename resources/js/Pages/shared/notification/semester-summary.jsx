import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { parseNotifContent, readableDate, readableTime, toTitleCase } from "@/others/function"
import NotifDetailCard, { NotifRow } from "@/Components/other/notif-detail-card"
import { Box, Typography } from "@mui/material"
import { CalendarClock } from "lucide-react"
import { Head } from "@inertiajs/react"

const SemesterSummaryNotification = ({ notif }) => {
    useMarkNotificationRead()

    const content = parseNotifContent(notif.content)
    const counts = content.counts || {}
    const entries = Object.entries(counts).filter(([, count]) => count > 0)

    return (
        <>
            <Head title="Semester Summary" />
            <NotifDetailCard
                icon={CalendarClock}
                tone="warning"
                title={content.label ? `${content.label} Has Ended` : "Semester Has Ended"}
                timestamp={`${readableDate(notif.created_at)} • ${readableTime(notif.created_at)}`}
            >
                <Typography sx={{ fontSize: "0.95rem", color: "text.primary", lineHeight: 1.65 }}>
                    {content.receiver_notif_message}
                </Typography>
                {entries.length > 0 && (
                    <Box sx={{ mt: 2, px: 2, py: 0.5, border: 1, borderColor: "divider", borderRadius: 2 }}>
                        {entries.map(([type, count]) => (
                            <NotifRow key={type} label={`${toTitleCase(type)}${count === 1 ? "" : "s"} Still Unresolved`}>{count}</NotifRow>
                        ))}
                    </Box>
                )}
            </NotifDetailCard>
        </>
    )
}

SemesterSummaryNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SemesterSummaryNotification
