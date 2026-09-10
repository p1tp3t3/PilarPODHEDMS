import NotifDisplayLayout from "@/Layouts/notif-display-layout"
import { useEffect, useState } from "react"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import { ComplaintService } from "@/others/services/complaint-service"
import { AlertTriangle } from "lucide-react"
import NotifDetailCard, { NotifEmptyState, NotifLoadingState } from "@/Components/other/notif-detail-card"

const ComplaintNotification = (props) => {
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

ComplaintNotification.layout = (page) => <NotifDisplayLayout user={page.props.user}>{page}</NotifDisplayLayout>

export default ComplaintNotification