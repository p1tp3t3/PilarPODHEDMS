import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { UserService } from "@/others/services/user-service"
import { useEffect, useState } from "react"
import NewUserList from "@/Components/list/new-user-list"
import Btn from "@/Components/button/normal-btn"
import { readableDate, readableTime, parseNotifContent } from "@/others/function"
import { UserPlus } from "lucide-react"
import NotifDetailCard from "@/Components/other/notif-detail-card"
import { Head } from "@inertiajs/react"
import { Stack, Typography } from "@mui/material"

const UserNotification = ({ user, notif }) => {
    useMarkNotificationRead()

    const [data, setData] = useState(notif)
    const [users, setUsers] = useState(null)

    const content = parseNotifContent(data.content)

    useEffect(() => {
        if (content.success) {
            UserService.getNewlyRegisteredUsers(content.new_user_date_registered, setUsers)
        }
    }, [])

    function downloadErrorBlob(errorBlob, fileName) {
    // Convert base64 to raw binary
    const byteCharacters = atob(errorBlob);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    // Create a Blob
    const blob = new Blob([byteArray], { type: 'text/plain' });

    // Create a temporary link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || 'error.txt';
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}


    return (
        <>
            <Head title="User Notification" />
            <NotifDetailCard
                icon={UserPlus}
                tone={content.success ? "success" : "danger"}
                title={content.success ? "User Account Generated Successfully" : "User Account Generation Failed"}
                timestamp={
                    content.success
                        ? `New users registered on ${content.new_user_date_registered}`
                        : `${readableDate(data.created_at)} • ${readableTime(data.created_at)}`
                }
            >
                {content.success
                    ? <NewUserList list={users} showTitle={false} />
                    : (
                        <Stack sx={{ alignItems: "center", gap: 1.5, py: 3, textAlign: "center" }}>
                            <Typography sx={{ fontSize: "0.95rem", color: "text.primary" }}>
                                Some accounts could not be created. The error file lists each row and why it failed.
                            </Typography>
                            <Btn onclick={() => downloadErrorBlob(content.error_blob, content.error_filename)}>Download Error File</Btn>
                        </Stack>
                    )}
            </NotifDetailCard>
        </>
    )
}

UserNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default UserNotification
