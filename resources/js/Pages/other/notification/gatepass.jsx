import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal"
import NotifDisplayLayout from "@/Layouts/notif-display-layout"
import { DoorOpen } from "lucide-react"
import NotifDetailCard from "@/Components/other/notif-detail-card"
import { parseNotifContent } from "@/others/function"

const GatePassNotification = (props) => {
    const content = parseNotifContent(props.notif.content)


    return (
        <NotifDetailCard icon={DoorOpen} tone="default" title="Gate Pass">
            <ViewGatePassModal.Body data={content['gatepass']} />
        </NotifDetailCard>
    )
}

GatePassNotification.layout = (page) => <NotifDisplayLayout user={page.props.user}>{page}</NotifDisplayLayout>

export default GatePassNotification