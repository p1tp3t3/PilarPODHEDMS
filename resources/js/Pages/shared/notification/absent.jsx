import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal"
import AuthLayout from "@/Layouts/auth-layout"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { AbsentFormService } from "@/others/services/absent-form-service"
import { CalendarX } from "lucide-react"
import { NotifRecordCard, NotifEmptyState, NotifLoadingState, useNotifRecord } from "@/Components/other/notif-detail-card"
import { Head } from "@inertiajs/react"

const AbsentNotification  = (props) => {
    useMarkNotificationRead()

    const data = useNotifRecord('absent_id', AbsentFormService.getAbsentFormInfo)

    return (
        <>
            <Head title="Absent Notification" />
            {props.notif.confirmed_at == null
                ?
                ((data != null)
                ?
                (data != '')
                ?
                <NotifRecordCard>
                    <ViewAbsentFormModal.Body data={data} />
                </NotifRecordCard>
                :
                <NotifEmptyState icon={CalendarX} message="No Absent Form Found" />
                :
                <NotifLoadingState />)
                :
                <NotifEmptyState icon={CalendarX} message="No Absent Form Found" />
            }
        </>
    )
}

AbsentNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default AbsentNotification