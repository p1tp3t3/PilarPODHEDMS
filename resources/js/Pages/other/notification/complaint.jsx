import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { useEffect, useState } from "react"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import { ComplaintService } from "@/others/services/complaint-service"
import { AlertTriangle } from "lucide-react"
import NotifDetailCard, { NotifEmptyState, NotifLoadingState } from "@/Components/other/notif-detail-card"

const ComplaintNotification = (props) => {
    useMarkNotificationRead()

    const [data, setData] = useState(null)

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('complaint_id')
        ComplaintService.getComplaintInfo(id, setData)
    }, [])
    return  (
            data != null
            ?
            (data != '')
            ?
            <NotifDetailCard icon={AlertTriangle} tone="default" title="Complaint Details">
                <ViewComplaintModal.Body data={data} usr={props.user} />
            </NotifDetailCard>
            :
            <NotifEmptyState icon={AlertTriangle} message="No Complaint Found" />
            :
            <NotifLoadingState size={5} />
    )
}

ComplaintNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ComplaintNotification
