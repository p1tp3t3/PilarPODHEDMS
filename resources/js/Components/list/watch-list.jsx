import { useEffect, useState } from "react"
import { router } from "@inertiajs/react"
import { Chip, IconButton, Tooltip } from "@mui/material"
import { RefreshCw, WifiOff } from "lucide-react"
import SearchBar from "../input/search-bar"
import { PanelBody, PanelHeader, PersonRow, matchesPerson } from "./dashboard-panel-parts"
import { DashboardService } from "@/others/services/dashboard-service"
import { readableTime, showUserType } from "@/others/function"

// Prefect dashboard "Watch List": currently enrolled students the logistic
// model predicts will repeat a violation (risk of 50% or more), highest
// risk first. Loaded when the tab opens; each row opens the student's
// Behavioural Analysis. Shows only "Likely to Commit", never the percentage.

// Opens the student's Behavioural Analysis with that violation selected.
const analysisUrl = (student, violationId) =>
    `/student-violation/${student.encrypted_id}?tab=analysis&violation=${violationId}&from=dashboard`

const WatchList = () => {
    const [data, setData] = useState(null)
    const [failed, setFailed] = useState(false)
    const [search, setSearch] = useState("")

    const load = (refresh = false) => {
        setData(null)
        setFailed(false)
        DashboardService.getWatchList(refresh, setData, () => setFailed(true))
    }

    useEffect(() => load(), [])

    const unavailable = failed || data?.available === false
    const students = data?.students ?? null
    const shown = unavailable ? [] : students?.filter((s) => matchesPerson(s, search)) ?? null

    return (
        <div className="flex flex-col h-full min-h-0">
            <PanelHeader
                title={`${students?.length ?? 0} Student${students?.length === 1 ? "" : "s"} to Monitor`}
                subtitle={
                    data?.available
                        ? `Predicted to repeat a violation · ${data.checked_students} enrolled checked · ${readableTime(data.generated_at)}`
                        : "Predicted to repeat a violation"
                }
            >
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <SearchBar
                            plc="Search by Name or ID"
                            h="h-[2.2rem]"
                            search={search}
                            setSearch={setSearch}
                            handleSearch={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Tooltip title="Recompute predictions">
                        <IconButton onClick={() => load(true)} size="small" sx={{ border: 1, borderColor: "divider" }}>
                            <RefreshCw size={15} />
                        </IconButton>
                    </Tooltip>
                </div>
            </PanelHeader>

            {unavailable ? (
                <div className="flex-1 min-h-[10rem] grid place-items-center text-center text-gray-500 px-4">
                    <div className="grid place-items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-gray-100 grid place-items-center text-gray-400">
                            <WifiOff size={22} />
                        </div>
                        <div className="text-[0.85em] font-medium">Prediction service unavailable — try again later.</div>
                    </div>
                </div>
            ) : (
                <PanelBody
                    list={shown}
                    empty={search ? "No matching students" : "No enrolled student is predicted to repeat a violation"}
                >
                    {shown?.map((s) => (
                            <PersonRow
                                key={s.id}
                                href={analysisUrl(s, s.violations[0]?.violation_id)}
                                title="Open Behavioural Analysis"
                                user={s}
                                sub={`${s.id_number ? `${s.id_number.toUpperCase()} · ` : ""}${showUserType(s)}`}
                                right={
                                    <Chip size="small" color="error" label="Likely to Commit" sx={{ fontWeight: 700, fontSize: "0.68rem", height: 22 }} />
                                }
                                footer={
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {s.violations.map((v) => (
                                            <Chip
                                                key={v.violation_id}
                                                size="small"
                                                clickable
                                                label={v.violation}
                                                onClick={(e) => {
                                                    // A chip opens its own violation, not the row's top one.
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    router.visit(analysisUrl(s, v.violation_id))
                                                }}
                                                title={`${v.past} time(s), ${v.recent} in the last 90 days — open this violation`}
                                                sx={{ maxWidth: "100%", height: 20, fontSize: "0.66rem", borderRadius: 1 }}
                                            />
                                        ))}
                                    </div>
                                }
                            />
                    ))}
                </PanelBody>
            )}
        </div>
    )
}

export default WatchList
