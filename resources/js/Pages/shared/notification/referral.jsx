import { ReferralService } from "@/others/services/referral-service"
import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import { Share2 } from "lucide-react"
import { NotifRecordCard, NotifEmptyState, NotifLoadingState, useNotifRecord } from "@/Components/other/notif-detail-card"
import { Head } from "@inertiajs/react"

const ReferralNotification = (props) => {
    useMarkNotificationRead()

    const data = useNotifRecord('referral_id', ReferralService.getReferralInfo)
    return  (
        <>
            <Head title="Referral Notification" />
            {data != null
            ?
            (data != '')
            ?
            <NotifRecordCard>
                <ViewReferralModal.Body data={data} />
            </NotifRecordCard>
            :
            <NotifEmptyState icon={Share2} message="No Referral Found" />
            :
            <NotifLoadingState />
            }
        </>
    )
}

ReferralNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ReferralNotification