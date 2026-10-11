import { useState, useEffect, useContext } from "react"
import { NotificationService } from "@/others/services/notification-service"
import AuthContext from "@/context-provider/auth-provider"
import { Link } from "@inertiajs/react"
import NotificationList from "../list/notification-list"
import TabSwitcher from "../other/tab-switcher"
import { motion } from "framer-motion"
import { CheckCheck, ChevronRight } from "lucide-react"

const NotificationModal = (props) => {

    const [choose, setChoose] = useState('all')

    const { usr } = useContext(AuthContext)
    const optionTab = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: 'Unread' },
    ]

    const handlePaginate = () => {
        NotificationService.list(choose, props.user.id, props.list.length + 2, (e) => {
            props.setter[0](e.notif)
            props.setter[1](e.unread_count)
        })
    }
    const displayAll = (type) => {
        if(type != choose) {
            setChoose(type)
        }
        props.setter[0](null)
        props.setter[1](0)
        NotificationService.list(type == 'all' ? 'all' : 'unread', props.user.id, 4, (e) => {
            props.setter[0](e.notif)
            props.setter[1](e.unread_count)
            props.setter[2](e.size)
        })
    }
    const markAllAsRead = () => {
        NotificationService.markAllAsRead((e) => {
            props.setter[0](e.notif)
            props.setter[1](e.unread_count)
        })
    }



    return (
        (props.click) &&
        <motion.div
            onClick={(e) => e.stopPropagation()}
            ref={props.ref}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`absolute top-0 right-0 mt-[2.8rem] w-full sm:w-[24rem] max-md:max-h-[calc(100dvh-9rem)] flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-xl bg-white`}
        >
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-[1.1em] font-bold text-gray-900">Notifications</h1>
                    {props.count > 0 && (
                        <span className="min-w-[1.4rem] h-[1.4rem] px-1.5 rounded-full bg-red-600 text-white text-[0.7em] font-semibold grid place-items-center">
                            {props.count > 99 ? "99+" : props.count}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={!props.count}
                    className="flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[0.75em] font-medium text-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:hover:bg-transparent"
                >
                    <CheckCheck size={14} /> Mark all as read
                </button>
            </div>

            <div className="px-2">
                <TabSwitcher tabs={optionTab} value={choose} onChange={displayAll} fullWidth />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-1">
                <NotificationList
                    list={props.list}
                    handlePaginate={handlePaginate}
                    size={props.size}
                />
            </div>

            <Link
                href="/notifications"
                className="flex items-center justify-center gap-1 border-t border-gray-100 py-2.5 text-[0.8em] font-medium text-blue-600 hover:bg-gray-50"
            >
                View all notifications <ChevronRight size={14} />
            </Link>
        </motion.div>
    )
}
export default NotificationModal

