import UpModal from "../up-modal"
import { getProfilePic, readableDate, readableTime, toTitleCase } from "@/others/function"
import ProfilePic from "@/Components/other/profile-pic"

const ViewActionLogModal = ({ close, closeModal, log }) => {
    const changes = Object.entries(log?.details_changes ?? {})

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            pd={["px-8", "py-6"]}
            isEnableOuterClose={true}
            bgColor="bg-white"
            w="w-[32rem]"
        >
            {log &&
            <div className="w-full grid gap-4">
                <h1 className="text-[1.1em]"><b>Action Log Detail</b></h1>

                <div className="flex items-center gap-3">
                    <ProfilePic size={2.2} src={getProfilePic(log.user?.profile?.profile_picture, log.user?.profile?.sex)} />
                    <div>
                        <div className="text-[0.9em] font-semibold">
                            {log.user?.profile?.first_name} {log.user?.profile?.last_name}
                        </div>
                        <div className="text-[0.75em] text-gray-500">
                            {toTitleCase(log.user?.id_number ?? "")} &middot; {toTitleCase(log.user?.role ?? "")}
                        </div>
                    </div>
                </div>

                <div className="grid gap-1 text-[0.85em] border-y py-3">
                    <div><span className="text-gray-500">Action Type:</span> {toTitleCase(log.action_type)}</div>
                    <div><span className="text-gray-500">Date / Time:</span> {readableDate(log.created_at)} ({readableTime(log.created_at)})</div>
                </div>

                <div className="grid gap-3">
                    <p className="text-[0.9em]">{log.details_summary}</p>

                    {changes.length > 0 &&
                    <div className="grid gap-2">
                        {changes.map(([field, change]) => (
                            <div key={field} className="grid gap-1 border rounded-md px-3 py-2 text-[0.85em]">
                                <span className="font-semibold capitalize">{field.replace(/_/g, " ")}</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 break-all">{String(change?.from ?? "—")}</span>
                                    <span className="text-gray-400">&rarr;</span>
                                    <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 break-all">{String(change?.to ?? "—")}</span>
                                </div>
                            </div>
                        ))}
                    </div>}
                </div>
            </div>}
        </UpModal>
    )
}

export default ViewActionLogModal
