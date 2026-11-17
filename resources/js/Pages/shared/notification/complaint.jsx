import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import { ComplaintService } from "@/others/services/complaint-service"
import { AlertTriangle } from "lucide-react"
import NotifDetailCard, { NotifEmptyState, NotifLoadingState, useNotifRecord } from "@/Components/other/notif-detail-card"
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
            <NotifDetailCard icon={AlertTriangle} tone="default" title="Complaint">
                <ViewComplaintModal.Body data={data} usr={props.auth.user} />
            </NotifDetailCard>
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
