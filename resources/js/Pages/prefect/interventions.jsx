import { useMemo, useState } from "react"
import { Head } from "@inertiajs/react"
import { Box } from "@mui/material"
import { CalendarDays, Phone, Share2, TriangleAlert } from "lucide-react"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { DataGrid } from "@/Components/other/data-grid"
import ProfilePic from "@/Components/other/profile-pic"
import DropdownField from "@/Components/input/dropdown"
import TabSwitcher from "@/Components/other/tab-switcher"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import ActionBtn from "@/Components/button/action-btn"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import ViewAppointmentModal from "@/Components/modal/view/view-appointment-modal"
import { PageActions } from "@/context-provider/page-title-provider"
import useListData from "@/others/hooks/use-list-data"
import { getProfilePic, getYearLevel, readableDate, readableTime, showUserType } from "@/others/function"

// The students already intervened: each attended appointment, attended call-in
// and approved referral (one row per referred student), newest first. Its
// related violation(s) show in its view.
const TYPES = {
    appointment: { label: "Appointment", icon: CalendarDays },
    call_in: { label: "Call-In", icon: Phone },
    referral: { label: "Referral", icon: Share2 },
    // An appointment set from a complaint (its Intervene button).
    complaint: { label: "Complaint", icon: TriangleAlert },
}
const nameOf = (u) => [u?.profile?.first_name, u?.profile?.last_name].filter(Boolean).join(" ") || "Deleted account"

// The type: tabs (no counts, like the other pages' tabs).
const TABS = [
    { key: "all", label: "All Interventions", short: "All" },
    { key: "appointment", label: "Appointments" },
    { key: "call_in", label: "Call-Ins" },
    { key: "referral", label: "Referrals" },
    { key: "complaint", label: "Complaints" },
]
// The tab and the filter dropdowns, kept in the URL
// (?type=&school-year=&semester=&program=&year-level=).
const FILTERS = ["school-year", "semester", "program", "year-level"]
const SEMESTERS = [{ val: "1", label: "1st Semester" }, { val: "2", label: "2nd Semester" }]
const YEAR_LEVELS = [1, 2, 3, 4].map((y) => ({ val: String(y), label: getYearLevel(y) }))

const Interventions = (props) => {
    const { data: lists } = useListData()
    const all = lists?.interventions?.data ?? null
    const [view, setView] = useState({ kind: null, id: null })

    const [filters, setFilters] = useState(() => {
        const q = new URLSearchParams(window.location.search)
        return Object.fromEntries(["type", ...FILTERS].map((k) => [k, q.get(k) ?? "all"]))
    })
    const changeFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: String(value) }))
        const url = new URL(window.location.href)
        if (value === "all" || value === "") url.searchParams.delete(key)
        else url.searchParams.set(key, value)
        window.history.replaceState(window.history.state, "", url)
    }
    const is = (key, value) => filters[key] === "all" || String(value ?? "") === filters[key]

    const rows = useMemo(() => (all ?? [])
        .filter((r) => is("type", r.type) && is("school-year", r.school_year) && is("semester", r.semester)
            && is("program", r.program_id) && is("year-level", r.year_level))
        .map((r, i) => ({ ...r, index: i + 1 })), [all, filters])

    const columns = useMemo(() => [
        { field: "index", headerName: "#", width: 70, sortable: false },
        { field: "reference", headerName: "Reference No.", width: 130, valueGetter: (v) => v ?? "N/A" },
        { field: "type", headerName: "Type", width: 120, valueGetter: (v) => TYPES[v]?.label ?? v },
        {
            field: "student", headerName: "Student", flex: 1, minWidth: 220,
            valueGetter: (_, row) => nameOf(row.student),
            renderCell: ({ row, value }) => (
                <div className="flex items-center gap-3 h-full">
                    <ProfilePic src={getProfilePic(row.student?.profile?.profile_picture, row.student?.profile?.sex)} size={2} />
                    <div className="flex flex-col justify-center leading-tight">
                        <div className="text-[0.8em] font-semibold">{value}</div>
                        {row.student && <div className="text-[0.7em] text-gray-600">{showUserType(row.student, true)}</div>}
                    </div>
                </div>
            ),
        },
        {
            field: "date", headerName: "Date Intervened", width: 190,
            renderCell: ({ value }) => value ? `${readableDate(value)} (${readableTime(value)})` : "N/A",
        },
        {
            field: "action", headerName: "Action", width: 100, sortable: false,
            renderCell: ({ row }) => row.type !== "call_in" && (
                <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setView({ kind: row.type === "complaint" ? "appointment" : row.type, id: row.encrypted_id })}>
                    View
                </ActionBtn>
            ),
        },
    ], [])

    return (
        <>
            <Head title="Interventions" />
            <ViewReferralModal
                close={view.kind === "referral"}
                closeModal={(v) => !v && setView({ kind: null, id: view.id })}
                pd={["px-10", "py-7"]}
                isEnableOuterClose={true}
                referralId={view.id}
                // Already an intervention for the student: nothing to intervene with here.
                canIntervene={false}
            />
            <ViewAppointmentModal
                close={view.kind === "appointment"}
                closeModal={(v) => !v && setView({ kind: null, id: view.id })}
                id={view.id}
            />
            <PageLayout actionsWithFilters title="INTERVENTIONS">
                <div className="overflow-x-auto">
                    <TabSwitcher tabs={TABS} value={filters.type} onChange={(key) => changeFilter("type", key)} onReselect={() => {}} />
                </div>
                {/* Filters (like the other list pages). */}
                <div className="flex flex-wrap gap-3">
                    <MobileFilters active={countActive(...FILTERS.map((k) => filters[k]))}>
                        <div className="w-full sm:w-48">
                            <DropdownField default={{ val: "all", label: "All School Years" }}
                                list={(props.school_years ?? []).map((y) => ({ val: y, label: y }))}
                                val={filters["school-year"]} onChange={(e) => changeFilter("school-year", e.target.value)} name="school-year" keepCase={true} />
                        </div>
                        <div className="w-full sm:w-44">
                            <DropdownField default={{ val: "all", label: "All Semesters" }} list={SEMESTERS}
                                val={filters.semester} onChange={(e) => changeFilter("semester", e.target.value)} name="semester" keepCase={true} />
                        </div>
                        <div className="w-full sm:w-44">
                            <DropdownField default={{ val: "all", label: "All Programs" }}
                                list={(props.programs ?? []).map((p) => ({ val: String(p.id), label: p.code }))}
                                val={filters.program} onChange={(e) => changeFilter("program", e.target.value)} name="program" keepCase={true} />
                        </div>
                        <div className="w-full sm:w-44">
                            <DropdownField default={{ val: "all", label: "All Year Levels" }} list={YEAR_LEVELS}
                                val={filters["year-level"]} onChange={(e) => changeFilter("year-level", e.target.value)} name="year-level" keepCase={true} />
                        </div>
                    </MobileFilters>
                    <PageActions />
                </div>
                <div className="flex w-full min-w-0">
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            loading={all == null}
                            pageSizeOptions={[5, 10, 20]}
                            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                            disableRowSelectionOnClick
                            pagination
                            getRowHeight={() => "auto"}
                            localeText={{ noRowsLabel: "No Students Intervened Yet" }}
                            showToolbar
                            // Phones: one row per intervention; tap for the rest.
                            mobileSummary={(row) => ({
                                name: nameOf(row.student),
                                role: TYPES[row.type]?.label,
                                picture: row.student?.profile?.profile_picture,
                                sex: row.student?.profile?.sex,
                                hide: ["student", "type"],
                            })}
                        />
                    </Box>
                </div>
            </PageLayout>
        </>
    )
}

Interventions.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Interventions
