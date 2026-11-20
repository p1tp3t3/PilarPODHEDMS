import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import { ComplaintService } from "@/others/services/complaint-service"
import { AlertTriangle } from "lucide-react"
import { NotifRecordCard, NotifEmptyState, NotifLoadingState, useNotifRecord } from "@/Components/other/notif-detail-card"
import { Head } from "@inertiajs/react"

const ComplaintNotification = (props) => {
    useMarkNotificationRead()

    const data = useNotifRecord('complaint_id', ComplaintService.getComplaintInfo)
    return  (
        <>
            <Head title="Complaint Notification" />
            {data != null
            ?
            (data != '')
            ?
            <NotifRecordCard>
                <ViewComplaintModal.Body data={data} usr={props.auth.user} />
            </NotifRecordCard>
            :
            <NotifEmptyState icon={AlertTriangle} message="No Complaint Found" />
            :
            <NotifLoadingState />
            }
        </>
    )
}

ComplaintNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ComplaintNotification
