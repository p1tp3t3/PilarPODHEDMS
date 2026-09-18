import UserReportLogList from "@/Components/list/user-report-log-list"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import DropdownField from "@/Components/input/dropdown"
import Btn from "@/Components/button/normal-btn"
import TabSwitcher from "@/Components/other/tab-switcher"
import { router } from "@inertiajs/react"
import { useState } from "react"
import GenerateActionLogReportMoodal from "@/Components/modal/submission-form/generate-action-log-report-modal"
import AccountStatistics from "./report/account-statistics"

const optionTab = [
    { key: "statistics", label: "Statistics" },
    { key: "action-log", label: "Action Log" },
]

const ITRCReport = (props) => {
    const [tab, setTab] = useState("statistics")
    const [action_log_list, setActionLogList] = useState(props.action_log_list)
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
    const params = new URLSearchParams(window.location.search)
    const [actionType, setActionType] = useState(params.get('action_type') || 'all')
    const [date, setDate] = useState(params.get('date') || '')
    const [report, openGenerateReport] = useState(false)

    const handleFilterChange = (field, value) => {
        const link = window.location.pathname

        const newActionType = field === 'action_type' ? value : actionType
        const newDate = field === 'date' ? value : date

        // Update both filters in the URL
        router.visit(`${link}?action_type=${newActionType}&date=${newDate}`)
    };
    return (
        <>
        <GenerateActionLogReportMoodal
            close={report} 
            closeModal={openGenerateReport} 
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            students={props.students}
        />
        <PageLayout title="REPORT">
            <TabSwitcher tabs={optionTab} value={tab} onChange={setTab} />

            {tab === "statistics" &&
            <AccountStatistics
                initial={props.statistics}
                schoolYears={props.school_years ?? []}
                userId={props.user?.id}
            />}

            {tab === "action-log" &&
            <div className="grid gap-6">
                <div className="w-full flex flex-wrap justify-between items-center gap-3">
                    <div className="flex gap-2">
                        <DropdownField
                            default={{ val: 'all', label: 'All Action Type' }}
                            list={actionList}
                            titleCase={true}
                            onChange={(e) => handleFilterChange('action_type', e.target.value)}
                            val={actionType}

                        />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => handleFilterChange('date', e.target.value)}
                            className="cursor-pointer border border-gray-500 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <Btn onclick={() => openGenerateReport(true)}>
                        Generate Report
                    </Btn>
                </div>
                <div>
                    <UserReportLogList
                        list={action_log_list}
                    />
                </div>
            </div>}
        </PageLayout>
        </>
    )
}

ITRCReport.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ITRCReport