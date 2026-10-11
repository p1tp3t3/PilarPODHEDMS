import { useState } from "react"
import { readableDate, readableTime, showUserType } from "@/others/function"
import { Link } from "@inertiajs/react"
import SearchBar from "../input/search-bar"
import { PanelBody, PanelHeader, PersonRow, matchesPerson } from "./dashboard-panel-parts"

const NewStudentList = ({ list = null, weekStart = null, weekEnd = null }) => {
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
                    <Link key={e.id} href={`/profile/${e.username}`} className="block">
                        <PersonRow
                            user={e}
                            sub={`${e.id_number ? `${e.id_number.toUpperCase()} · ` : ""}${showUserType(e)}`}
                            right={
                                <>
                                    <span className="text-[0.7em] text-gray-500">{readableDate(e.created_at)}</span>
                                    <span className="text-[0.68em] text-gray-400">{readableTime(e.created_at)}</span>
                                </>
                            }
                        />
                    </Link>
                ))}
            </PanelBody>
        </div>
    )
}

export default NewStudentList
