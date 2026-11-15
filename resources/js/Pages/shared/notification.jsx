import TabSwitcher from "@/Components/other/tab-switcher"
import NotificationList from "@/Components/list/notification-list"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { NotificationService } from "@/others/services/notification-service"
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read"
import { useMemo, useState } from "react"
import useListData, { reloadListData } from "@/others/hooks/use-list-data"
import { X, CheckCheck, ListChecks, Trash2 } from "lucide-react"
import { Head } from "@inertiajs/react"
import { LabeledCheckbox, setRowsChecked } from "@/Components/input/select-checkbox"

const Notification = (props) => {

    const [select, enableSelect] = useState(false),
          [choose, setChoose] = useState('all'),
          // How many are shown ("Load more" adds 10).
          [shown, setShown] = useState(10)

    // Every notification loads from /api/notifications once the page opens;
    // the All / Unread tabs and "Load more" work on it in the browser.
    const { data: lists } = useListData()
    const all = lists?.notification ?? null
    const filtered = useMemo(
        () => (all == null ? null : choose === 'unread' ? all.filter((n) => !n.read_since) : all),
        [all, choose]
    )
    const notif_list = filtered == null ? null : filtered.slice(0, shown)
    const size = filtered?.length ?? 0
    // After a delete: the list is fetched again.
    const setNotifList = () => reloadListData()

    useMarkNotificationRead()

    const tab = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: 'Unread' },
    ]
    const handleSelect = (type) => {
        if(choose != type) {
            setChoose(type)
            setShown(10)
        }
    }
    const deleteNotif = (e) => {
        const checkboxes = document.querySelectorAll('input[name="selected-row"]:checked')
        const ids = Array.from(checkboxes).map((checkbox) => checkbox.value)

        NotificationService.deleteSelected(ids, setNotifList)

        setRowsChecked(false)
    }
    const selectAllRow = (e) => {
        setRowsChecked(e.target.checked)
    }
    const markAllAsRead = () => {
        NotificationService.markAllAsRead(() => reloadListData())
    }

    const handlePaginate = () => setShown((n) => n + 10)

    return (
        <>
            <Head title="Notifications" />
            <PageLayout title="Notifications">
                <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-4 pt-3 border-b border-gray-100">
                        <div className="w-full sm:w-72 [&_.MuiTabs-root]:border-b-0">
                            <TabSwitcher tabs={tab} value={choose} onChange={handleSelect} fullWidth />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pb-2">
                            {select ? (
                                <>
                                    <span className="flex items-center rounded-full border border-gray-300 pl-1 pr-3 py-0.5 text-[0.75em] font-medium text-gray-700">
                                        <LabeledCheckbox label="Select all" id="select-all" onChange={selectAllRow} />
                                    </span>
                                    <button
                                        type="button"
                                        onClick={deleteNotif}
                                        className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[0.75em] font-medium text-white hover:bg-red-700"
                                    >
                                        <Trash2 size={14} /> Delete selected
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => enableSelect(false)}
                                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75em] font-medium text-gray-600 hover:bg-gray-100"
                                    >
                                        <X size={14} /> Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={markAllAsRead}
                                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75em] font-medium text-blue-600 hover:bg-blue-50"
                                    >
                                        <CheckCheck size={14} /> Mark all as read
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => enableSelect(true)}
                                        className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-[0.75em] font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <ListChecks size={14} /> Select
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="px-4 pb-4">
                        <NotificationList
                            list={notif_list}
                            overflow={false}
                            enableDel={true}
                            select={select}
                            handlePaginate={handlePaginate}
                            size={size}
                            deleteNotif={(i) => NotificationService.deleteOne(i, setNotifList)}
                        />
                    </div>
                </div>
            </PageLayout>
        </>
    )
}

Notification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Notification