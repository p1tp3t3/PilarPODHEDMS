import TabSwitcher from "@/Components/other/tab-switcher"
import PageLayout from "@/Layouts/page-layout"
import AuthLayout from "@/Layouts/auth-layout"
import { router } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"
import RadioButton from "@/Components/input/radio"
import DropdownField from "@/Components/input/dropdown"
import BetweenTextfield from "@/Components/input/between-input"
import ArchiveList from "@/Components/list/archive-list"
import ReportFilterList from "@/Components/list/report-filter-list"
import GeneratedReportsList from "@/Components/list/generated-reports-list"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import IncidentReport from "./report/incident-report"
import GenerateReportModal from "@/Components/modal/submission-form/generate-report-modal"
import { useReload } from "@/context-provider/reload-provider"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import ViewReportModal from "@/Components/modal/view/view-report-modal"
import AnalyticalReport from "./report/risk-analysis"
import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal"
import { showWarningModal, toTitleCase } from "@/others/function"
import ViolationReport from "./report/violation-report"
import TardyReport from "./report/tardy-report"
import AppointmentReport from "./report/appointment-report"
import GatePassReport from "./report/gatepass-report"
import { Plus } from "lucide-react"

const semesterList = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]

const PrefectReport = (props) => {
    const optionTab = [
        { key: 'incident-report', label: 'Incident Report' },
        { key: 'violation-report', label: 'Violation Report' },
        { key: 'tardy-report', label: 'Tardy Report' },
        { key: 'appointment-report', label: 'Appointment Report' },
        { key: 'gatepass-report', label: 'Gate Pass Report' },
        { key: 'analytics', label: 'Analytical Report' },
        { key: 'saved-filters', label: 'Saved Filters' },
        { key: 'generated-reports', label: 'Generated Reports' },
    ]

    const [choose, setChoose] = useState('incident-report')

    // Which report-type tab a saved filter belongs to comes from wherever
    // "Create Filter" was clicked — not a choice inside the modal anymore.
    // Tracked separately from `choose` since Analytical Report/Saved
    // Filters/Generated Reports aren't report types themselves; the Saved
    // Filters tab's own "+ New Filter" button falls back to whichever of
    // the 5 type tabs was last actually viewed.
    const TAB_TO_TYPE = {
        'incident-report': 'incident',
        'violation-report': 'violation',
        'tardy-report': 'tardy',
        'appointment-report': 'appointment',
        'gatepass-report': 'gatepass',
    }
    const [lastReportTab, setLastReportTab] = useState('incident-report')

    // One shared filter for every list tab above (not a separate copy per
    // tab) — reloads the page's report props from the server with the
    // chosen date range / school year+semester applied. The Analytical
    // Report tab keeps its own independent filter+export, unrelated to this.
    const [filterBy, setFilterBy] = useState('date')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [schoolYearId, setSchoolYearId] = useState('')
    const [semester, setSemester] = useState('')

    const hasUsableFilter = filterBy === 'date' ? (dateFrom && dateTo) : !!schoolYearId

    useEffect(() => {
        if (!hasUsableFilter) return

        router.get(window.location.pathname, {
            filter_by: filterBy,
            date_from: filterBy === 'date' ? dateFrom : '',
            date_to: filterBy === 'date' ? dateTo : '',
            school_year_id: filterBy === 'school_year' ? schoolYearId : '',
            semester: filterBy === 'school_year' ? semester : '',
        }, { preserveState: true, preserveScroll: true, replace: true })
    }, [filterBy, dateFrom, dateTo, schoolYearId, semester])
    const [choose2, setChoose2] = useState('all'),
          [complaint, openViewComplaint] = useState(false),
          [absent, openAbsentForm] = useState(false),
          [referral, openViewReferral] = useState(false),
          [report, openGenerateReport] = useState(false),
          [viewReport, openViewReport] = useState(false),
          [id, setDocId] = useState(''),

          [report_list, setReportList] = useState(props.report),
          [violation_report_list, setViolationReportList] = useState(props.violation_report.data),
          [tardy_report_list, setTardyReportList] = useState(props.tardy_report),
          [appointment_report_list, setAppointmentReportList] = useState(props.appointment_report),
          [gatepass_report_list, setGatepassReportList] = useState(props.gatepass_report),

          [archive_list, setArchiveList] = useState(props.archive)

    // Saved report filters — a reusable preset instead of the old
    // "generate a file right away" modal. `editingFilter` is null for
    // "create a new one"; the Saved Filters tab's Edit action sets it
    // before opening the same modal, and it's cleared again the moment the
    // modal closes so a later "Create Filter" click (from any of the type
    // tabs above) never reopens stale edit state.
    const [reportFilters, setReportFilters] = useState([])
    const [editingFilter, setEditingFilter] = useState(null)

    const loadReportFilters = () => ReportArchiveService.getReportFilters(setReportFilters)

    const { loadRegister } = useReload()
    const contentRef = useRef()

    // Re-sync the local lists whenever the shared filter above triggers a
    // fresh Inertia reload of these props (preserveState keeps the
    // component mounted, so useState's initial value alone won't update).
    useEffect(() => setReportList(props.report), [props.report])
    useEffect(() => setViolationReportList(props.violation_report.data), [props.violation_report])
    useEffect(() => setTardyReportList(props.tardy_report), [props.tardy_report])
    useEffect(() => setAppointmentReportList(props.appointment_report), [props.appointment_report])
    useEffect(() => setGatepassReportList(props.gatepass_report), [props.gatepass_report])
    useEffect(() => loadReportFilters(), [])
    useEffect(() => { if (!report) setEditingFilter(null) }, [report])

    const handleSelect = (type) => {
        if(choose != type) {
            const url = window.location.pathname;
            setChoose(type)
            if (TAB_TO_TYPE[type]) setLastReportTab(type)
        }
    }
    const setId = (id, type) => {
        setDocId(id)
        if(type == 'c') {
            openViewComplaint(true)
        }if(type == 'r') {
            openViewReferral(true)
        }if(type == 'a') {
            openAbsentForm(true)
        }
    }
    const recoverDocument = (i, t, usr) => {
        const data = {
            id: i,
            type: t
        }
        showWarningModal(
            `Are You Sure You Want to Recover the Complaint of ${usr.first_name} ${usr.middle_name} ${usr.last_name}?`,
            "Recover " + toTitleCase(t),
            "Cancel",
            () => {
                loadRegister(true, 'text-wait', `Recovering ${toTitleCase(t)} No. ${i}. Please Wait`)
                ReportArchiveService.recover(
                    i, t,
                    setArchiveList,
                    () => loadRegister(true, 'success', `${toTitleCase(t)} No. ${i} Recover Successfully`),
                    () => loadRegister(true, 'error', `Failed to Recover ${toTitleCase(t)} No. ${i}`)
                )
            }
        );
    }
    const actionEvent = (i, type) => {
        switch(type) {
            case 'v':
                openViewReport(true)
                break
            case 'ed':
                break
            case 'ex':
                break
            case 'd':
                ReportArchiveService.deleteReport(i, (e) => setReportList(e.data))
                break
        }
    }

    return (
        <>
        <ViewAbsentFormModal
            close={absent}
            closeModal={openAbsentForm}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            id={id}
        />
        <ViewComplaintModal
            close={complaint}
            closeModal={openViewComplaint}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            complainant={id}
            usr={props.user}
        />
        <ViewReferralModal
            close={referral}
            closeModal={openViewReferral}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            referralId={id}
            usr={props.user}
        />
        <ViewReportModal
            close={viewReport}
            closeModal={openViewReport}
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
        />
        <GenerateReportModal
            close={report}
            closeModal={openGenerateReport}
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            reload={loadRegister}
            setter={setReportList}
            violations={props.violation_list}
            incidents={props.incident_list}
            programs={props.programs}
            students={props.students}
            schoolYears={props.school_years}
            userId={props.user.id}
            editingFilter={editingFilter}
            onSaved={loadReportFilters}
            defaultType={TAB_TO_TYPE[choose] ?? TAB_TO_TYPE[lastReportTab]}
            allowTypeChoice={choose === 'saved-filters'}
        />
            <PageLayout title="REPORT">
                    <div className="grid gap-5 min-w-0">
                        <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
                        {choose !== 'analytics' && choose !== 'saved-filters' && choose !== 'generated-reports' &&
                        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-5 grid gap-4 min-w-0">
                            <RadioButton
                                list={[
                                    { val: "date", label: "Date Range" },
                                    { val: "school_year", label: "School Year" },
                                ]}
                                id="filter_by"
                                name="filter_by"
                                val={filterBy}
                                change={(e) => {
                                    setFilterBy(e.target.value)
                                    setDateFrom("")
                                    setDateTo("")
                                    setSchoolYearId("")
                                    setSemester("")
                                }}
                            />

                            {filterBy === "date" &&
                            <div className="max-w-md">
                                <BetweenTextfield
                                    type="date"
                                    labels={["Date From", "Date To"]}
                                    name={["date_from", "date_to"]}
                                    id={["date_from", "date_to"]}
                                    data={[dateFrom, dateTo]}
                                    setData={(updater) => {
                                        const next = typeof updater === "function" ? updater({ date_from: dateFrom, date_to: dateTo }) : updater
                                        setDateFrom(next.date_from ?? "")
                                        setDateTo(next.date_to ?? "")
                                    }}
                                />
                            </div>}

                            {filterBy === "school_year" &&
                            <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                                <div className="w-full">
                                    <DropdownField
                                        default={{ val: "", label: "Select School Year" }}
                                        list={(props.school_years_full ?? []).map((y) => ({ val: y.id, label: y.year }))}
                                        onChange={(e) => setSchoolYearId(e.target.value)}
                                        name="school_year_id"
                                        val={schoolYearId}
                                    />
                                </div>
                                <div className="w-full">
                                    <DropdownField
                                        default={{ val: "", label: "All Semesters" }}
                                        list={semesterList}
                                        onChange={(e) => setSemester(e.target.value)}
                                        name="semester"
                                        val={semester}
                                    />
                                </div>
                            </div>}
                        </div>}
                        {choose == 'incident-report' &&
                        <IncidentReport
                            openGenerateReport={openGenerateReport}
                            report={report_list}
                            events={actionEvent}
                        />}
                        {choose == 'violation-report' &&
                        <ViolationReport
                            openGenerateReport={openGenerateReport}
                            report={violation_report_list}
                        />}
                        {choose == 'tardy-report' &&
                        <TardyReport
                            openGenerateReport={openGenerateReport}
                            report={tardy_report_list}
                        />}
                        {choose == 'appointment-report' &&
                        <AppointmentReport
                            openGenerateReport={openGenerateReport}
                            report={appointment_report_list}
                        />}
                        {choose == 'gatepass-report' &&
                        <GatePassReport
                            openGenerateReport={openGenerateReport}
                            report={gatepass_report_list}
                        />}
                        {choose == 'analytics' &&
                        <AnalyticalReport
                            quantity={[props.incident, props.resolved, props.violation_count]}
                            top5Student={props.top5_students}
                            incidentLineGraph={props.incident_line_graph}
                            violationProgram={props.violation_program}
                            userId={props.user.id}
                        />}
                        {choose == 'saved-filters' &&
                        <div className="grid gap-3">
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setEditingFilter(null); openGenerateReport(true) }}
                                    className="flex items-center gap-2 px-4 py-2 text-[0.9em] rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                    <Plus size={16} /> New Filter
                                </button>
                            </div>
                            <ReportFilterList
                                list={reportFilters}
                                onEdit={(f) => { setEditingFilter(f); openGenerateReport(true) }}
                                onChange={loadReportFilters}
                            />
                        </div>}
                        {choose == 'generated-reports' &&
                        <GeneratedReportsList />}
                    </div>
            </PageLayout>
        </>
    )
}

PrefectReport.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectReport
