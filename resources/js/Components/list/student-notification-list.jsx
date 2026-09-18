import { useEffect, useState } from "react"
import ProfilePic from "../other/profile-pic"
import ListSkeleton from "../reload/list-skeleton"
import { NotificationService } from "@/others/services/notification-service"
import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase } from "@/others/function"
import TabSwitcher from "../other/tab-switcher"
import { Link } from "@inertiajs/react"
import SearchBar from "../input/search-bar"
import { AlertCircle, Clock } from "lucide-react"

const StudentNotificationList = () => {
    const [notif_list, setNotifList] = useState(null),
          [raw_list, setRawList] = useState(null)

    const [choose, setChoose] = useState('callin')
    const [search, setSearch] = useState('')

    useEffect(() => {
        NotificationService.getCallInList((res) => {
            setNotifList(res)
            setRawList(res)
        })
    }, [])

    const optionTab = [
        { key: 'callin', label: 'Call In' },
        { key: 'appointment', label: 'Appointment' },
    ]

    const handleSelect = (type) => {
        setNotifList(null)
        setChoose(type)
        setSearch("") // reset search

        NotificationService.getByType(type, (res) => {
            setNotifList(res)
            setRawList(res)
        })
    }

    // ⭐ SEARCH FUNCTION (works with name + user ID)
    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase()
        setSearch(value)

        if (!value.trim()) {
            setNotifList(raw_list)
            return
        }

        const filtered = raw_list.filter((item) => {
            const user = item.receiver
            const fullName = `${user.profile?.first_name} ${user.profile?.middle_name ?? ""} ${user.profile?.last_name}`.toLowerCase()
            const userId = String(user.id_number).toLowerCase()

            return fullName.includes(value) || userId.includes(value)
        })

        setNotifList(filtered)
    }

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

    let lastGroup = ''

    return (
        <div className="w-full pb-5">
            <div className="w-full flex flex-col gap-2 px-5 py-2">
                <b>Notifications</b>
                <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
            </div>

            <div className="px-5 pb-3">
                <SearchBar
                    plc='Search by Name or ID'
                    search={search}
                    setSearch={setSearch}
                    handleSearch={handleSearch}
                />
            </div>

            <div className="overflow-hidden overflow-y-auto h-[20rem] w-full flex flex-col px-5">
                {(notif_list != null)
                ?
                (notif_list.length != 0)
                ?
                [...notif_list].sort(
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
                                <Row data={e} />
                            </div>
                        </div>
                    );
                })
                :
                <div className="text-[1em] text-gray-500 w-full grid place-items-center h-full">
                    <div className="grid place-items-center">
                        <div className="text-[4em] grid place-items-center">
                            <AlertCircle size="1em" />
                        </div>
                        <div>No New Notifications</div>
                    </div>
                </div>
                :
                <div className="text-[1em] text-gray-500 w-full grid place-items-center h-full">
                    <ListSkeleton rows={4} />
                </div>}
            </div>
        </div>
    )
}

const Row = ({ data }) => {
    return (
        <Link href={`/notifications?id=${data.id}`}>
            <div className="border-gray-300 border-b-[1px] hover:bg-gray-100">
                <div className="flex flex-col gap-2 px-3 py-2">
                    <div className="text-[0.8em] grid gap-2">
                        <div className="flex justify-between items-center">
                            <div className="flex gap-4">
                                <div className="flex gap-2">
                                    <div className="flex-shrink-0">
                                        <ProfilePic
                                            size={2.3}
                                            src={getProfilePic(data.receiver.profile?.profile_picture, data.receiver.profile?.sex)}
                                        />
                                    </div>
                                    <div className="w-[8rem]">
                                        <div className="text-sm font-semibold">{data.receiver.profile?.first_name} {data.receiver.profile?.middle_name} {data.receiver.profile?.last_name}</div>
                                        <div className="text-xs text-gray-500">{showUserType(data.receiver)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[0.8rem] self-center relative"> 
                                {(data.read_since == null)
                                ?       
                                <div className="w-[0.8rem] h-[0.8rem] bg-blue-400 rounded-full right-0"></div>
                                :
                                <div className="right-0">
                                    {`Seen At ${readableDate(data.read_since)} ${readableTime(data.read_since)}`}
                                </div>}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-600 text-[0.9em] flex items-center gap-1">
                                <Clock size={12} /> {readableDate(data.created_at)} ({readableTime(data.created_at)})
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default StudentNotificationList
