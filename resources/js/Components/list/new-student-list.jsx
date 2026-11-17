import { useState } from "react"
import useListData from "@/others/hooks/use-list-data"
import { readableDate, readableTime, showUserType, profileUrl } from "@/others/function"
import { Typography } from "@mui/material"
import SearchBar from "../input/search-bar"
import { PanelBody, PanelHeader, PersonRow, matchesPerson } from "./dashboard-panel-parts"

// Loads its rows from the API (/api/dashboard/panel/new-students).
const NewStudentList = ({ weekStart = null, weekEnd = null }) => {
    const { data } = useListData("/api/dashboard/panel/new-students", {})
    const list = data?.list ?? null
    const [search, setSearch] = useState("")
    const shown = list?.filter((e) => matchesPerson(e, search)) ?? null

    return (
        <div className="flex flex-col h-full min-h-0">
            <PanelHeader
                title={`${list?.length ?? 0} New Students`}
                subtitle={`This Week${weekStart && weekEnd ? ` · ${readableDate(weekStart)} – ${readableDate(weekEnd)}` : ""}`}
            >
                <SearchBar
                    plc="Search by Name or ID"
                    h="h-[2.2rem]"
                    search={search}
                    setSearch={setSearch}
                    handleSearch={(e) => setSearch(e.target.value)}
                />
            </PanelHeader>
            <PanelBody list={shown} empty={search ? "No matching students" : "No new students this week"}>
                {shown?.map((e) => (
                        <PersonRow
                            key={e.id}
                            href={profileUrl(e)}
                            user={e}
                            sub={`${e.id_number ? `${e.id_number.toUpperCase()} · ` : ""}${showUserType(e)}`}
                            right={
                                <>
                                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{readableDate(e.created_at)}</Typography>
                                    <Typography sx={{ fontSize: "0.68rem", color: "text.disabled" }}>{readableTime(e.created_at)}</Typography>
                                </>
                            }
                        />
                ))}
            </PanelBody>
        </div>
    )
}

export default NewStudentList
