import NotificationWrapper from "@/wrapper/notif-wrapper"
import ActionBtn from "../button/action-btn"
import AbsentFormNotif from "../card/notif/absent-form-notif"
import AppointmentNotif from "../card/notif/appointment-notif"
import CallInNotif from "../card/notif/call-in-notif"
import ComplaintNotif from "../card/notif/complaint-notif"
import GatePassNotif from "../card/notif/gatepass-notif"
import NormalNotif from "../card/notif/normal-notif"
import ReferralNotif from "../card/notif/referral-notif"
import { toTitleCase, parseNotifContent } from "@/others/function"
import { motion } from "framer-motion"
import { BellOff, Trash2 } from "lucide-react"

const NotificationList = ({ 
    list = null, 
    overflow = true, 
    enableDel = false, 
    handlePaginate, 
    select = false,
    deleteNotif = (i) => {},
    size = 0
}) => {
    
    const getGroupLabel = (timestamp) => {
        const created = new Date(timestamp);
        const today = new Date();

        created.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - created.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays === 2) return "2 Days Ago";
        if (diffDays === 3) return "3 Days Ago";

        return created.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    let lastGroup = ""

    return (
        <div>
            <div className={`w-full flex flex-col ${overflow ? 'h-[23rem] overflow-hidden overflow-y-auto' : ''}`}>
                    {(list != null)
                    ?
                    (list.length != 0)
                    ?
                    [...list].sort(
                        (a, b) => new Date(b.created_at) - new Date(a.created_at)
                    ).map((e, i) => {
                        const groupLabel = getGroupLabel(e.created_at);
                        const showHeader = groupLabel !== lastGroup;
                        lastGroup = groupLabel;


                        return (
                            <div key={i} className="relative">
                                {showHeader && (
                                <div className="text-sm mt-3 mb-1">
                                    <b>{toTitleCase(groupLabel)}</b>
                                </div>
                                )}

                                <div className="relative">
                                    <Notif
                                        obj={e}
                                        enableDel={enableDel}
                                        select={select}
                                        deleteNotif={deleteNotif}
                                    />
                                </div>
                            </div>
                        );
                    })
                    :
                    <motion.div
                        className="w-full h-full flex flex-col items-center justify-center py-10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <div className="mb-3 text-gray-400">
                            <BellOff size={48} />
                        </div>

                        <h1 className="text-[1.2em] text-gray-500 font-semibold">
                            No Notifications Yet
                        </h1>

                        <p className="text-sm text-gray-400 mt-1">
                            You're all caught up!
                        </p>
                    </motion.div>

                    :
                     <div className={`w-full flex flex-col ${overflow ? 'h-[23rem] overflow-hidden overflow-y-auto' : ''}`}>
                        <div className="grid gap-4 p-3">
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-full p-4 rounded-lg bg-gray-200"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <div className="h-4 w-32 bg-gray-300 rounded mb-3"></div>
                                    <div className="h-3 w-full bg-gray-300 rounded mb-2"></div>
                                    <div className="h-3 w-3/4 bg-gray-300 rounded mb-2"></div>
                                    <div className="h-3 w-1/2 bg-gray-300 rounded"></div>
                                </motion.div>
                            ))}
                        </div>
                    </div>}
                    {((list != null && list.length > 3 && list.length < size)) && 
                    <div className="py-4 w-full">
                        <button 
                            type="button"
                            className="w-full py-2 bg-gray-500 text-[0.8em] text-white rounded-md hover:bg-gray-600 transition-colors"
                            onClick={handlePaginate}
                        >
                            See Previous Notifications
                        </button>
                    </div>}
                </div>
        </div>
    )
}

const Notif = ({ obj = null, enableDel, select, deleteNotif }) => {
    const content = parseNotifContent(obj.content)

    const d = <ActionBtn 
                  className="hidden group-hover:block bg-red-600 hover:bg-red-700 absolute top-1/2 -translate-y-1/2 right-2 p-2"
                  onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteNotif(obj.id)
                  }}
                >
                 <Trash2 size={14} />
              </ActionBtn>
    const checkBox = <input type="checkbox" name="selected-row" className="absolute top-1/2 -translate-y-1/2 right-2" onClick={(e) => e.stopPropagation()} value={obj.id} />
    switch(obj.notif_type) {
        case 'complaint':
            return <NotificationWrapper link={`/notifications?id=${obj.id}&complaint_id=${content.id}`}>
                       <ComplaintNotif obj={obj} />
                       {(enableDel && !select) 
                       ? 
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
        case 'referral':
            return <NotificationWrapper link={`/notifications?id=${obj.id}&referral_id=${content.id}`}>
                       <ReferralNotif obj={obj} />
                       {(enableDel && !select) 
                       ? 
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
        case 'absent':
            return <NotificationWrapper link={`/notifications?absent_id=${content.id}&id=${obj.id}`}>
                       <AbsentFormNotif obj={obj} />
                       {(enableDel && !select) 
                       ? 
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
        case 'appointment':
            return <NotificationWrapper link={`/notifications?id=${obj.id}`}>
                       <AppointmentNotif obj={obj} />
                       {(enableDel && !select) 
                       ? 
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
        case 'gatepass':
            return <NotificationWrapper link={`/notifications?gatepass_id=${content.id}&id=${obj.id}`}>
                       <GatePassNotif obj={obj} />
                       {(enableDel && !select) 
                       ? 
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
        case 'violation_access':
            return <NotificationWrapper link={`/violation-management?tab=access-requests&id=${obj.id}`}>
                       <NormalNotif obj={obj} />
                       {(enableDel && !select)
                       ?
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
        case 'call_in':
            return <NotificationWrapper link={`/notifications?id=${obj.id}`}>
                       <CallInNotif obj={obj} />
                       {(enableDel && !select) 
                       ? 
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
        default:
            return <NotificationWrapper link={`/notifications?id=${obj.id}`}>
                       <NormalNotif obj={obj} />
                       {(enableDel && !select) 
                       ? 
                       d
                       :
                       (select)
                       ? checkBox
                       : ''}
                   </NotificationWrapper>
    }
}
export default NotificationList