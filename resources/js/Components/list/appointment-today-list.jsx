import { useState } from "react"
import { readableDate, readableTime, showUserType } from "@/others/function"
import { Clock } from "lucide-react"
import SearchBar from "../input/search-bar"
import { PanelBody, PanelHeader, PersonRow, matchesPerson } from "./dashboard-panel-parts"

const AppointmentTodayList = ({ list = null }) => {
    const [search, setSearch] = useState("")
    const shown = list?.filter((e) => matchesPerson(e.user, search)) ?? null

    return (
        <div className="flex flex-col h-full min-h-0">
            <PanelHeader title="Upcoming Scheduled Appointments" subtitle={list?.length ? `${list.length} scheduled` : null}>
                <SearchBar
                    plc="Search by Name or ID"
                    h="h-[2.2rem]"
                    search={search}
                    setSearch={setSearch}
                    handleSearch={(e) => setSearch(e.target.value)}
                />
            </PanelHeader>
            <PanelBody list={shown} empty={search ? "No matching appointments" : "No upcoming appointments"}>
                {shown?.map((e) => (
                    <PersonRow
                        key={e.id}
                        user={e.user}
                        sub={`${e.user?.id_number ? `${e.user.id_number.toUpperCase()} · ` : ""}${showUserType(e.user)}`}
                        right={
                            <>
                                <span className="text-[0.7em] text-gray-500">{readableDate(e.date_time_appoint)}</span>
                                <span className="text-[0.7em] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 inline-flex items-center gap-1">
                                    <Clock size={11} /> {readableTime(e.date_time_appoint)}
                                </span>
                            </>
                        }
                    />
                ))}
            </PanelBody>
        </div>
    )
}

export default AppointmentTodayList
