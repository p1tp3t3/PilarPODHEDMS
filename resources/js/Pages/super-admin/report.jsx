import UserReportLogList from "@/Components/list/user-report-log-list"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import DropdownField from "@/Components/input/dropdown"
import ReportFilterModal from "@/Components/modal/submission-form/report-filter-modal"
import { SlidersHorizontal, X } from "lucide-react"
import Btn from "@/Components/button/normal-btn"
import { Head, router } from "@inertiajs/react"
import { useState } from "react"
import GenerateActionLogReportMoodal from "@/Components/modal/submission-form/generate-action-log-report-modal"
import AccountStatistics from "./report/account-statistics"

// Each is its own page: /super-admin/report/{statistics|action-log}.
const TITLES = { statistics: "Statistics", "action-log": "Action Log" }

const semesterList = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]

const EMPTY_LOG_FILTER = { action_type: "all", filter_by: "date", date_from: "", date_to: "", school_year_id: "", semester: "" }

const fmtDate = (d) => new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

// The chips beside the Filter button: action type, then the range.
const logFilterChips = (f, actionList, schoolYears) => {
    const chips = []
    if (f.action_type && f.action_type !== "all")
        chips.push(actionList.find((a) => a.val === f.action_type)?.label ?? f.action_type)
    if (f.filter_by === "date") {
        if (f.date_from && f.date_to) chips.push(`${fmtDate(f.date_from)} – ${fmtDate(f.date_to)}`)
        else if (f.date_from) chips.push(`From ${fmtDate(f.date_from)}`)
        else if (f.date_to) chips.push(`Until ${fmtDate(f.date_to)}`)
    } else if (f.school_year_id) {
        const year = schoolYears.find((y) => String(y.id) === String(f.school_year_id))?.year
        const sem = semesterList.find((s) => String(s.val) === String(f.semester))?.label ?? "All Semesters"
        chips.push(`SY ${year ?? ""} · ${sem}`)
    }
    return chips
}

const ITRCReport = (props) => {
    const params = new URLSearchParams(window.location.search)
    const tab = props.section ?? "statistics"
    const actionList = [
        { val: 'login', label: 'Login' },
        { val: 'logout', label: 'Logout' },
        { val: 'register', label: 'Register' },
        { val: 'account activation', label: 'Account Activation' },
        { val: 'account update', label: 'Account Update' },
        { val: 'profile update', label: 'Profile Update' },
        { val: 'complaint', label: 'Complaint' },
        { val: 'referral', label: 'Referral' },
        { val: 'appointment', label: 'Appointment' },
        { val: 'gatepass', label: 'Gatepass' },
    ]
    const [filters, setFilters] = useState({
        action_type: params.get('action_type') || 'all',
        filter_by: params.get('filter_by') || 'date',
        date_from: params.get('date_from') || '',
        date_to: params.get('date_to') || '',
        school_year_id: params.get('school_year_id') ? Number(params.get('school_year_id')) : '',
        semester: params.get('semester') ? Number(params.get('semester')) : '',
    })
    const [report, openGenerateReport] = useState(false)
    const [filterModal, openFilterModal] = useState(false)

    const applyFilters = (next) => {
        setFilters(next)
        const query = { action_type: next.action_type, filter_by: next.filter_by }
        if (next.filter_by === 'date') {
            if (next.date_from) query.date_from = next.date_from
            if (next.date_to) query.date_to = next.date_to
        } else {
            if (next.school_year_id) query.school_year_id = next.school_year_id
            if (next.semester) query.semester = next.semester
        }
        router.get(window.location.pathname, query, {
            preserveState: true,
            preserveScroll: true,
            only: ['action_log_list'],
        })
    }

    const chips = logFilterChips(filters, actionList, props.school_years ?? [])
    return (
        <>
        <Head title={TITLES[tab]} />
        <GenerateActionLogReportMoodal
            close={report} 
            closeModal={openGenerateReport} 
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            students={props.students}
            schoolYears={props.school_years ?? []}
        />
        <PageLayout title={TITLES[tab].toUpperCase()}>

            {tab === "statistics" &&
            <AccountStatistics
                initial={props.statistics}
                schoolYears={props.school_years ?? []}
                userId={props.auth?.user?.id}
            />}

            {tab === "action-log" &&
            <div className="grid gap-6">
                <ReportFilterModal
                    close={filterModal}
                    closeModal={openFilterModal}
                    value={filters}
                    schoolYears={props.school_years ?? []}
                    emptyValue={EMPTY_LOG_FILTER}
                    canApply={() => true}
                    schoolYearLabel="All School Years"
                    description="Show only the logs of an action type, within a date range or a school year."
                    extraFields={(draft, setDraft) => (
                        <DropdownField
                            default={{ val: 'all', label: 'All Action Type' }}
                            list={actionList}
                            titleCase={true}
                            onChange={(e) => setDraft((prev) => ({ ...prev, action_type: e.target.value }))}
                            val={draft.action_type}
                            name="log_action_type"
                        />
                    )}
                    onApply={applyFilters}
                    onClear={() => applyFilters(EMPTY_LOG_FILTER)}
                />
                <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <button
                            type="button"
                            onClick={() => openFilterModal(true)}
                            className={`flex items-center gap-2 px-4 py-2 text-[0.9em] rounded border transition-colors ${
                                chips.length
                                    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <SlidersHorizontal size={16} /> Filter
                        </button>
                        {chips.map((c) => (
                            <span key={c} className="max-w-full truncate px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
                                {c}
                            </span>
                        ))}
                        {chips.length > 0 &&
                        <button
                            type="button"
                            onClick={() => applyFilters(EMPTY_LOG_FILTER)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.85em] text-gray-600 hover:bg-gray-100"
                        >
                            <X size={13} /> Clear
                        </button>}
                    </div>
                    <Btn onclick={() => openGenerateReport(true)}>
                        Generate Report
                    </Btn>
                </div>
                <div>
                    <UserReportLogList
                        list={props.action_log_list}
                    />
                </div>
            </div>}
        </PageLayout>
        </>
    )
}

ITRCReport.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ITRCReport