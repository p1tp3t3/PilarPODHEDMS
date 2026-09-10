import NotifDisplayLayout from "@/Layouts/notif-display-layout"
import { readableDate, readableTime, parseNotifContent } from "@/others/function"
import { PhoneCall } from "lucide-react"
import NotifDetailCard from "@/Components/other/notif-detail-card"

const CallInNotification = (props) => {
    const content = parseNotifContent(props.notif.content);

    return (
        <NotifDetailCard
            icon={PhoneCall}
            tone="default"
            title="You Have Been Called In By The Prefect"
            timestamp={`${readableDate(props.notif.created_at)} • ${readableTime(props.notif.created_at)}`}
        >
            <div className="grid gap-4">
                <p className="text-gray-700 text-[0.95em]">
                    {content.receiver_notif_message}
                </p>
                <div className="pt-3 border-t border-gray-50 text-[0.88em] text-gray-500 grid gap-0.5">
                    <p>From: Office of the Prefect</p>
                    <p>Prefect Of Discipline Of The Higher Education Department</p>
                </div>
            </div>
        </NotifDetailCard>
    )
}

CallInNotification.layout = (page) => <NotifDisplayLayout user={page.props.user}>{page}</NotifDisplayLayout>

export default CallInNotification
