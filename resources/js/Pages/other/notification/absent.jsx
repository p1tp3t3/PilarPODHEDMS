import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal"
import NotifDisplayLayout from "@/Layouts/notif-display-layout"
import { AbsentFormService } from "@/others/services/absent-form-service"
import { useEffect, useState } from "react"
import { CalendarX } from "lucide-react"
import NotifDetailCard, { NotifEmptyState, NotifLoadingState } from "@/Components/other/notif-detail-card"
import { parseNotifContent } from "@/others/function"

const AbsentNotification  = (props) => {
    const content = parseNotifContent(props.notif.content)

    const [data, setData] = useState(null)

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('absent_id')
        AbsentFormService.getAbsentFormInfo(id, setData)
    }, [])


    return (
                props.notif.confirmed_at == null
                ?
                ((data != null)
                ?
                (data != '')
                ?
                <NotifDetailCard icon={CalendarX} tone="default" title="Absent Form">
                    <ViewAbsentFormModal.Body data={data} />
                </NotifDetailCard>
                :
                <NotifEmptyState icon={CalendarX} message="No Absent Form Found" />
                :
                <NotifLoadingState size={5} />)
                :
                <NotifEmptyState icon={CalendarX} message="No Absent Form Found" />
    )
}

AbsentNotification.layout = (page) => <NotifDisplayLayout user={page.props.user}>{page}</NotifDisplayLayout>

const ApproveModal = ({ content }) =>  {
    return (
        <div className="bg-white shadow rounded-lg w-full max-w-2xl p-6">
            <h1 className="text-2xl font-bold mb-4">
                Your Absent Form Has Been Approved
            </h1>
            <div className="border-t border-b py-4 mb-6">
                <p className="mb-2 text-gray-700">
                    <span className="font-medium">Date: {content.date_appoint}</span>
                </p>
                <p className="mb-2 text-gray-700">
                    <span className="font-medium">Time: {content.time_appoint}</span>
                </p>
                <p className="text-gray-700">
                    {content.reason}
                </p>
            </div>
            <div>
                <p className="text-gray-700">
                    From: Prefect Name
                </p>
                <p className="text-gray-700">
                    Prefect Of Discipline Of The Higher Education Department
                </p>
            </div>
        </div>
    )
}

export default AbsentNotification