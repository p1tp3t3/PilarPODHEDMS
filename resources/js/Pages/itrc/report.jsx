import UserReportLogList from "@/Components/list/user-report-log-list"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import DropdownField from "@/Components/input/dropdown"
import RadioButton from "@/Components/input/radio"
import BetweenTextfield from "@/Components/input/between-input"
import Btn from "@/Components/button/normal-btn"
import TabSwitcher from "@/Components/other/tab-switcher"
import { Head, router } from "@inertiajs/react"
import { useState } from "react"
import GenerateActionLogReportMoodal from "@/Components/modal/submission-form/generate-action-log-report-modal"
import AccountStatistics from "./report/account-statistics"

const optionTab = [
    { key: "statistics", label: "Statistics" },
    { key: "action-log", label: "Action Log" },
]

const semesterList = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]

const ITRCReport = (props) => {
    const params = new URLSearchParams(window.location.search)
    const [tab, setTab] = useState(params.get('tab') || "statistics")
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

    const applyFilters = (next) => {
        setFilters(next)
        const query = { tab: 'action-log', action_type: next.action_type, filter_by: next.filter_by }
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

    const handleFilterChange = (field, value) => applyFilters({ ...filters, [field]: value })
    return (
        <>
        <Head title="Report" />
        <GenerateActionLogReportMoodal
            close={report} 
            closeModal={openGenerateReport} 
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            students={props.students}
            schoolYears={props.school_years ?? []}
        />
        <PageLayout title="REPORT">
            <TabSwitcher tabs={optionTab} value={tab} onChange={setTab} />

            {tab === "statistics" &&
            <AccountStatistics
                initial={props.statistics}
                schoolYears={props.school_years ?? []}
                userId={props.auth?.user?.id}
            />}

            {tab === "action-log" &&
            <div className="grid gap-6">
                <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-5 grid gap-4 min-w-0">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <RadioButton
                            list={[
                                { val: "date", label: "Date Range" },
                                { val: "school_year", label: "School Year" },
                            ]}
                            id="log_filter_by"
                            name="log_filter_by"
                            val={filters.filter_by}
                            change={(e) => applyFilters({
                                ...filters,
                                filter_by: e.target.value,
                                date_from: '',
                                date_to: '',
                                school_year_id: '',
                                semester: '',
                            })}
                        />
                        <Btn onclick={() => openGenerateReport(true)}>
                            Generate Report
                        </Btn>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <div className="w-full sm:max-w-[14rem]">
                            <DropdownField
                                default={{ val: 'all', label: 'All Action Type' }}
                                list={actionList}
                                titleCase={true}
                                onChange={(e) => handleFilterChange('action_type', e.target.value)}
                                val={filters.action_type}
                            />
                        </div>
                        {filters.filter_by === "date" &&
                        <div className="w-full max-w-md">
                            <BetweenTextfield
                                type="date"
                                labels={["Date From", "Date To"]}
                                name={["date_from", "date_to"]}
                                id={["log_date_from", "log_date_to"]}
                                data={[filters.date_from, filters.date_to]}
                                setData={(updater) => applyFilters(typeof updater === "function" ? updater(filters) : updater)}
                            />
                        </div>}
                        {filters.filter_by === "school_year" &&
                        <div className="w-full flex flex-col sm:flex-row gap-3 max-w-xl">
                            <div className="w-full">
                                <DropdownField
                                    default={{ val: "", label: "All School Years" }}
                                    list={(props.school_years ?? []).map((y) => ({ val: y.id, label: y.year }))}
                                    onChange={(e) => applyFilters({ ...filters, school_year_id: e.target.value, semester: e.target.value ? filters.semester : '' })}
                                    name="school_year_id"
                                    val={filters.school_year_id}
                                />
                            </div>
                            <div className="w-full">
                                <DropdownField
                                    default={{ val: "", label: "All Semesters" }}
                                    list={semesterList}
                                    onChange={(e) => handleFilterChange('semester', e.target.value)}
                                    name="semester"
                                    val={filters.semester}
                                />
                            </div>
                        </div>}
                    </div>
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