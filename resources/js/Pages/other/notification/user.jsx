import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { UserService } from "@/others/services/user-service"
import { useEffect, useState } from "react"
import NewUserList from "@/Components/list/new-user-list"
import Btn from "@/Components/button/normal-btn"
import { readableDate, readableTime, parseNotifContent } from "@/others/function"
import { UserPlus } from "lucide-react"
import NotifDetailCard from "@/Components/other/notif-detail-card"

const UserNotification = ({ user, notif }) => {
    useMarkNotificationRead()

    const [data, setData] = useState(notif)
    const [users, setUsers] = useState(null)
    const [loading, setLoading] = useState(true)

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
        <div className="w-full max-w-4xl mx-auto py-6 sm:py-10 space-y-5">
            <NotifDetailCard
                icon={UserPlus}
                tone={content.success ? "success" : "danger"}
                title={content.success ? "User Account Generated Successfully" : "User Account Generation Failed"}
                timestamp={
                    content.success
                        ? `New users registered on ${content.new_user_date_registered}`
                        : `${readableDate(data.created_at)} • ${readableTime(data.created_at)}`
                }
            />
            {content.success
            ?
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7">
                <NewUserList list={users} showTitle={false} />
            </div>
            : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="text-gray-500 text-center py-10 space-y-3">
                        <Btn onclick={() => downloadErrorBlob(content.error_blob, content.error_filename)}>Download Error File</Btn>
                        <p className="text-[0.85em]">Since {readableDate(data.created_at)} {readableTime(data.created_at)}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

UserNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default UserNotification
