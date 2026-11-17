import { useState } from "react"
import useListData from "@/others/hooks/use-list-data"
import { readableDate, readableTime, showUserType } from "@/others/function"
import { Clock } from "lucide-react"
import { Chip, Typography } from "@mui/material"
import SearchBar from "../input/search-bar"
import { PanelBody, PanelHeader, PersonRow, matchesPerson } from "./dashboard-panel-parts"

// Loads its rows from the API (/api/dashboard/panel/appointments).
const AppointmentTodayList = () => {
    const { data } = useListData("/api/dashboard/panel/appointments", {})
    const list = data?.list ?? null
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
                                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{readableDate(e.date_time_appoint)}</Typography>
                                <Chip size="small" color="primary" variant="outlined" icon={<Clock size={12} />}
                                    label={readableTime(e.date_time_appoint)} sx={{ height: 22, fontSize: "0.7rem" }} />
                            </>
                        }
                    />
                ))}
            </PanelBody>
        </div>
    )
}

export default AppointmentTodayList
