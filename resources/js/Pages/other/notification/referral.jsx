import { useState, useEffect } from "react"
import { ReferralService } from "@/others/services/referral-service"
import NotifDisplayLayout from "@/Layouts/notif-display-layout"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import { Share2 } from "lucide-react"
import NotifDetailCard, { NotifEmptyState, NotifLoadingState } from "@/Components/other/notif-detail-card"

const ReferralNotification = (props) => {
    const [data, setData] = useState(null)

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('referral_id')
        ReferralService.getReferralInfo(id, setData)
    }, [])
    return  (
            data != null
            ?
            (data != '')
            ?
            <NotifDetailCard icon={Share2} tone="default" title="Referral Notification">
                <div className="w-full space-y-5">
                    <ViewReferralModal.Body data={data} />
                    {props.user.role == 'staff' &&
                    <>
                    <div>
                        <h1 className="text-[1em]"><b>Message from Prefect:</b></h1>
                        <div className="mt-2 text-[0.9em]">
                            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Natus consequuntur harum quia hic, voluptas saepe libero corporis adipisci ab praesentium officiis quisquam magni repellendus ad ipsum vitae reiciendis incidunt velit?
                        </div>
                    </div>
                    <div>
                        <div>
                            {(data.file_path == null) &&
                            <a href={data.file_path} target="_blank" className="text-blue-500 underline">Download Attachment</a>}
                        </div>
                    </div>
                    </>}
                </div>
            </NotifDetailCard>
            :
            <NotifEmptyState icon={Share2} message="No Referral Found" />
            :
            <NotifLoadingState size={5} />
    )
}

ReferralNotification.layout = (page) => <NotifDisplayLayout user={page.props.user}>{page}</NotifDisplayLayout>

export default ReferralNotification