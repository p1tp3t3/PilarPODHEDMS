import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal"
import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { DoorOpen } from "lucide-react"
import NotifDetailCard from "@/Components/other/notif-detail-card"
import { parseNotifContent } from "@/others/function"

const GatePassNotification = (props) => {
    useMarkNotificationRead()

    const content = parseNotifContent(props.notif.content)


    return (
        <NotifDetailCard icon={DoorOpen} tone="default" title="Gate Pass">
            <ViewGatePassModal.Body data={content['gatepass']} />
        </NotifDetailCard>
    )
}

GatePassNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default GatePassNotification
