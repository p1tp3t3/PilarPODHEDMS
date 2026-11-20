import { useEffect, useState } from "react"
import { Chip } from "@mui/material"
import { PanelBody, PanelHeader, PersonRow, matchesPerson } from "./dashboard-panel-parts"
import SearchBar from "../input/search-bar"
import { DashboardService } from "@/others/services/dashboard-service"
import { readableDate, readableTime, showUserType } from "@/others/function"

// Prefect dashboard "Intervened" tab: the students intervened this week (an
// attended appointment or call-in, an approved referral), newest first.
// Each row opens the Interventions page on that type.
const TYPES = {
    appointment: { label: "Appointment", color: "primary" },
    call_in: { label: "Call-In", color: "info" },
    referral: { label: "Referral", color: "secondary" },
    complaint: { label: "Complaint", color: "warning" },
}

const InterventionsThisWeekList = () => {
    const [data, setData] = useState(null)
    const [failed, setFailed] = useState(false)
    const [search, setSearch] = useState("")

    useEffect(() => {
        DashboardService.getInterventionsThisWeek(setData, () => setFailed(true))
    }, [])

    const rows = failed ? [] : data?.interventions ?? null
    const shown = rows?.filter((r) => matchesPerson(r.student, search)) ?? null
    const students = rows ? new Set(rows.map((r) => r.student?.id)).size : 0
    const range = data ? `${readableDate(data.week_start)} – ${readableDate(data.week_end)}` : "This week"

    return (
        <div className="flex flex-col h-full min-h-0">
            <PanelHeader
                title={`${students} Student${students === 1 ? "" : "s"} Intervened This Week`}
                subtitle={range}
            >
                <SearchBar
                    plc="Search by Name or ID"
                    h="h-[2.2rem]"
                    search={search}
                    setSearch={setSearch}
                    handleSearch={(e) => setSearch(e.target.value)}
                />
            </PanelHeader>
            <PanelBody
                list={shown}
                empty={failed ? "Could not load this week's interventions" : search ? "No matching students" : "No student has been intervened this week"}
            >
                {shown?.map((r) => {
                    const type = TYPES[r.type] ?? { label: r.type, color: "default" }
                    return (
                        <PersonRow
                            key={r.id}
                            href={`/prefect/interventions?type=${r.type}`}
                            title="Open Interventions"
                            user={r.student}
                            sub={`${r.student ? showUserType(r.student) : ""}${r.reference ? ` · #${r.reference}` : ""}`}
                            right={
                                <div className="grid justify-items-end gap-0.5">
                                    <Chip size="small" color={type.color} variant="outlined" label={type.label}
                                        sx={{ fontWeight: 700, fontSize: "0.68rem", height: 22 }} />
                                    <span className="text-[0.7em] text-gray-500 whitespace-nowrap">
                                        {readableDate(r.date)} · {readableTime(r.date)}
                                    </span>
                                </div>
                            }
                        />
                    )
                })}
            </PanelBody>
        </div>
    )
}

export default InterventionsThisWeekList
