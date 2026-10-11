import { useEffect, useState } from "react"
import { NotificationService } from "@/others/services/notification-service"
import { readableDate, readableTime, showUserType, toTitleCase } from "@/others/function"
import TabSwitcher from "../other/tab-switcher"
import { Link } from "@inertiajs/react"
import SearchBar from "../input/search-bar"
import { Clock } from "lucide-react"
import { PanelBody, PanelHeader, PersonRow } from "./dashboard-panel-parts"

const optionTab = [
    { key: 'callin', label: 'Call In' },
    { key: 'appointment', label: 'Appointment' },
]

const getGroupLabel = (timestamp) => {
    const created = new Date(timestamp)
    const today = new Date()
    created.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays === 2) return "2 Days Ago"
    if (diffDays === 3) return "3 Days Ago"
    return created.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const StudentNotificationList = () => {
    const [notif_list, setNotifList] = useState(null),
          [raw_list, setRawList] = useState(null),
          [choose, setChoose] = useState('callin'),
          [search, setSearch] = useState('')

    useEffect(() => {
        NotificationService.getCallInList((res) => {
            setNotifList(res)
            setRawList(res)
        })
    }, [])

    const handleSelect = (type) => {
        setNotifList(null)
        setChoose(type)
        setSearch("")
        NotificationService.getByType(type, (res) => {
            setNotifList(res)
            setRawList(res)
        })
    }

    // Matches on the receiver's full name or ID number.
    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase()
        setSearch(value)

        if (!value.trim()) {
            setNotifList(raw_list)
            return
        }

        setNotifList((raw_list ?? []).filter((item) => {
            const user = item.receiver
            const fullName = `${user.profile?.first_name} ${user.profile?.middle_name ?? ""} ${user.profile?.last_name}`.toLowerCase()
            return fullName.includes(value) || String(user.id_number).toLowerCase().includes(value)
        }))
    }

    let lastGroup = ''
    const sorted = notif_list ? [...notif_list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : null

    return (
        <div className="flex flex-col h-full min-h-0">
            <PanelHeader title="Notifications">
                <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} fullWidth />
                <SearchBar
                    plc='Search by Name or ID'
                    h='h-[2.2rem]'
                    search={search}
                    setSearch={setSearch}
                    handleSearch={handleSearch}
                />
            </PanelHeader>
            <PanelBody list={sorted} empty="No new notifications">
                {sorted?.map((e, i) => {
                    const groupLabel = getGroupLabel(e.created_at)
                    const showHeader = groupLabel !== lastGroup
                    lastGroup = groupLabel

                    return (
                        <div key={e.id ?? i}>
                            {showHeader && (
                                <div className="px-2 pt-3 pb-1 text-[0.72em] font-semibold uppercase tracking-wide text-gray-500">
                                    {toTitleCase(groupLabel)}
                                </div>
                            )}
                            <Link href={`/notifications?id=${e.id}`} className="block">
                                <PersonRow
                                    user={e.receiver}
                                    sub={showUserType(e.receiver)}
                                    footer={
                                        <div className="mt-0.5 text-[0.68em] text-gray-400 flex items-center gap-1">
                                            <Clock size={11} /> {readableDate(e.created_at)} · {readableTime(e.created_at)}
                                        </div>
                                    }
                                    right={
                                        e.read_since == null ? (
                                            <span className="text-[0.65em] font-semibold text-blue-600 inline-flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-blue-500" /> Unseen
                                            </span>
                                        ) : (
                                            <span className="text-[0.65em] text-gray-400 leading-tight">
                                                Seen<br />{readableDate(e.read_since)}
                                            </span>
                                        )
                                    }
                                />
                            </Link>
                        </div>
                    )
                })}
            </PanelBody>
        </div>
    )
}

export default StudentNotificationList
