import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal"
import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { GatePassService } from "@/others/services/gatepass-service"
import { DoorOpen } from "lucide-react"
import { NotifRecordCard, NotifEmptyState, NotifLoadingState, useNotifRecord } from "@/Components/other/notif-detail-card"
import { Head } from "@inertiajs/react"

// The gate pass is fetched (?gatepass_id=), not read from the notification,
// so it shows the pass as it is now.
const GatePassNotification = () => {
    useMarkNotificationRead()

    const data = useNotifRecord('gatepass_id', GatePassService.getGatePassRecord)

    return (
        <>
            <Head title="Gate Pass Notification" />
            {data != null
            ?
            (data != '')
            ?
            <NotifRecordCard>
                <ViewGatePassModal.Body data={data} />
            </NotifRecordCard>
            :
            <NotifEmptyState icon={DoorOpen} message="No Gate Pass Found" />
            :
            <NotifLoadingState />
            }
        </>
    )
}

GatePassNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default GatePassNotification
