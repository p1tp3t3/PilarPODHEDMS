import { useEffect, useState } from "react"
import { Link, router } from "@inertiajs/react"
import { RefreshCw, WifiOff } from "lucide-react"
import SearchBar from "../input/search-bar"
import { PanelBody, PanelHeader, PersonRow, matchesPerson } from "./dashboard-panel-parts"
import { DashboardService } from "@/others/services/dashboard-service"
import { readableTime, showUserType } from "@/others/function"

// Prefect dashboard "Watch List": currently enrolled students the logistic
// model predicts will repeat a violation (risk of 50% or more), highest
// risk first. Loaded when the tab opens; each row opens the student's
// Behavioural Analysis.

const pct = (p) => `${Math.round(p * 100)}%`
// Opens the student's Behavioural Analysis with that violation selected.
const analysisUrl = (student, violationId) =>
    `/student-violation/${student.encrypted_id}?tab=analysis&violation=${violationId}&from=dashboard`

const riskClass = (p) => (p >= 0.75 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700")

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
                    <button
                        type="button"
                        onClick={() => load(true)}
                        title="Recompute predictions"
                        className="shrink-0 h-[2.2rem] w-[2.2rem] grid place-items-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                        <RefreshCw size={15} />
                    </button>
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
                        <Link key={s.id} href={analysisUrl(s, s.violations[0]?.violation_id)} className="block" title="Open Behavioural Analysis">
                            <PersonRow
                                user={s}
                                sub={`${s.id_number ? `${s.id_number.toUpperCase()} · ` : ""}${showUserType(s)}`}
                                right={
                                    <span className={`px-2 py-0.5 rounded-full text-[0.72em] font-bold ${riskClass(s.top_probability)}`}>
                                        {pct(s.top_probability)} risk
                                    </span>
                                }
                                footer={
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {s.violations.map((v) => (
                                            <span
                                                key={v.violation_id}
                                                role="link"
                                                onClick={(e) => {
                                                    // A chip opens its own violation, not the row's top one.
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    router.visit(analysisUrl(s, v.violation_id))
                                                }}
                                                className="max-w-full truncate text-[0.66em] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
                                                title={`${v.past} time(s), ${v.recent} in the last 90 days — open this violation`}
                                            >
                                                {v.violation} · {pct(v.probability)}
                                            </span>
                                        ))}
                                    </div>
                                }
                            />
                        </Link>
                    ))}
                </PanelBody>
            )}
        </div>
    )
}

export default WatchList
