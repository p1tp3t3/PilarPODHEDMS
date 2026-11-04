import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import ReportStatistics from "./report/report-statistics"
import AuthLayout from "@/Layouts/auth-layout"
import { router, Link } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"
import ReportFilterModal, { EMPTY_REPORT_FILTER, isUsableReportFilter, reportFilterSummary } from "@/Components/modal/submission-form/report-filter-modal"
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
import { Plus, SlidersHorizontal, X } from "lucide-react"
import { Head } from "@inertiajs/react"

const PrefectReport = (props) => {
    // Each report is its own page (/prefect/report/{section}, see
    // routes/auth.php); the URL section maps to the view shown below.
    const SECTIONS = {
        'incident': { key: 'incident-report', label: 'Incident Report' },
        'violation': { key: 'violation-report', label: 'Violation Report' },
        'tardy': { key: 'tardy-report', label: 'Tardy Report' },
        'appointment': { key: 'appointment-report', label: 'Appointment Report' },
        'gatepass': { key: 'gatepass-report', label: 'Gate Pass Report' },
        'analytics': { key: 'analytics', label: 'Analytical Report' },
        'saved-filters': { key: 'saved-filters', label: 'Saved Filters' },
        'generated': { key: 'generated-reports', label: 'Generated Reports' },
    }
    const current = SECTIONS[props.section] ?? SECTIONS.incident
    const choose = current.key
    // Report-type pages have two tabs: the records table and its statistics.
    const isReportType = Boolean(props.report_stats)
    const [view, setView] = useState('records')

    // Saved filters are only created from the Saved Filters page ("+ New
    // Filter"), where the modal lets the report type be chosen; this maps a
    // report page to its type for that modal's default.
    const TAB_TO_TYPE = {
        'incident-report': 'incident',
        'violation-report': 'violation',
        'tardy-report': 'tardy',
        'appointment-report': 'appointment',
        'gatepass-report': 'gatepass',
    }
    // On its own page now, Saved Filters' "+ New Filter" defaults to the
    // incident type (the modal lets the type be changed there).
    const lastReportTab = 'incident-report'

    // One shared filter for every list tab above (not a separate copy per
    // tab) — reloads the page's report props from the server with the
    // chosen date range / school year+semester applied. It's edited in a
    // modal (Filter button); the Analytical Report tab keeps its own
    // independent filter+export, unrelated to this.
    const [filterModal, openFilterModal] = useState(false)
    const [appliedFilter, setAppliedFilter] = useState(() => {
        const q = new URLSearchParams(window.location.search)
        const f = { ...EMPTY_REPORT_FILTER }
        Object.keys(f).forEach((k) => { if (q.get(k)) f[k] = q.get(k) })
        return isUsableReportFilter(f) ? f : EMPTY_REPORT_FILTER
    })
    const hasFilter = isUsableReportFilter(appliedFilter)

    const reloadWith = (query) =>
        router.get(window.location.pathname, query, { preserveState: true, preserveScroll: true, replace: true })

    const applyFilter = (f) => {
        setAppliedFilter(f)
        reloadWith({
            filter_by: f.filter_by,
            date_from: f.filter_by === 'date' ? f.date_from : '',
            date_to: f.filter_by === 'date' ? f.date_to : '',
            school_year_id: f.filter_by === 'school_year' ? f.school_year_id : '',
            semester: f.filter_by === 'school_year' ? f.semester : '',
        })
    }

    const clearFilter = () => {
        setAppliedFilter(EMPTY_REPORT_FILTER)
        reloadWith({})
    }

    const filterSummary = reportFilterSummary(appliedFilter, props.school_years_full ?? [])
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
    // modal closes so a later "+ New Filter" click never reopens stale
    // edit state.
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
        <Head title={current.label} />
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
            usr={props.auth.user}
        />
        <ViewReferralModal
            close={referral}
            closeModal={openViewReferral}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            referralId={id}
            usr={props.auth.user}
        />
        <ViewReportModal
            close={viewReport}
            closeModal={openViewReport}
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
        />
        <ReportFilterModal
            close={filterModal}
            closeModal={openFilterModal}
            value={appliedFilter}
            schoolYears={props.school_years_full ?? []}
            onApply={applyFilter}
            onClear={clearFilter}
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
            userId={props.auth.user.id}
            editingFilter={editingFilter}
            onSaved={loadReportFilters}
            defaultType={TAB_TO_TYPE[choose] ?? TAB_TO_TYPE[lastReportTab]}
            allowTypeChoice={choose === 'saved-filters'}
        />
            <PageLayout title={current.label.toUpperCase()}>
                    <div className="grid gap-5 min-w-0">
                        {choose !== 'analytics' && choose !== 'saved-filters' && choose !== 'generated-reports' && view !== 'generate' &&
                        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
                            {hasFilter &&
                            <span className="flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
                                <span className="truncate">{filterSummary}</span>
                                <button
                                    type="button"
                                    onClick={clearFilter}
                                    title="Clear filter"
                                    aria-label="Clear filter"
                                    className="grid place-items-center w-5 h-5 rounded-full hover:bg-blue-100"
                                >
                                    <X size={13} />
                                </button>
                            </span>}
                            <button
                                type="button"
                                onClick={() => openFilterModal(true)}
                                className={`flex items-center gap-2 px-4 py-2 text-[0.9em] rounded border transition-colors ${
                                    hasFilter
                                        ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <SlidersHorizontal size={16} /> Filter
                            </button>
                        </div>}
                        {isReportType &&
                        <TabSwitcher
                            tabs={[
                                { key: 'records', label: 'Records' },
                                { key: 'statistics', label: 'Statistics' },
                                { key: 'generate', label: 'Generate Report' },
                            ]}
                            value={view}
                            onChange={setView}
                        />}
                        {isReportType && view === 'statistics' &&
                        <ReportStatistics stats={props.report_stats} />}
                        {/* Pick one of this report type's saved filters and generate
                            the file (queued; it lands in Generated Reports). */}
                        {isReportType && view === 'generate' &&
                        <div className="grid gap-3 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[0.85em] text-gray-600">
                                <span>Choose a saved {current.label.toLowerCase()} filter to generate.</span>
                                <span className="flex gap-4">
                                    <Link href="/prefect/report/saved-filters" className="text-blue-700 hover:underline">Manage saved filters</Link>
                                    <Link href="/prefect/report/generated" className="text-blue-700 hover:underline">Generated reports</Link>
                                </span>
                            </div>
                            <ReportFilterList
                                list={reportFilters.filter((f) => f.report_type === TAB_TO_TYPE[choose])}
                                showType={false}
                                generateOnly
                                emptyLabel={`No saved ${current.label.toLowerCase()} filters yet`}
                            />
                        </div>}
                        {view === 'records' && choose == 'incident-report' &&
                        <IncidentReport
                            report={report_list}
                            events={actionEvent}
                        />}
                        {view === 'records' && choose == 'violation-report' &&
                        <ViolationReport
                            report={violation_report_list}
                        />}
                        {view === 'records' && choose == 'tardy-report' &&
                        <TardyReport
                            report={tardy_report_list}
                        />}
                        {view === 'records' && choose == 'appointment-report' &&
                        <AppointmentReport
                            report={appointment_report_list}
                        />}
                        {view === 'records' && choose == 'gatepass-report' &&
                        <GatePassReport
                            report={gatepass_report_list}
                        />}
                        {choose == 'analytics' &&
                        <AnalyticalReport
                            quantity={[props.incident, props.resolved, props.violation_count]}
                            top5Student={props.top5_students}
                            incidentLineGraph={props.incident_line_graph}
                            incidentTrendSeries={props.incident_trend_series}
                            incidentTrendLabels={props.incident_trend_labels}
                            violationProgram={props.violation_program}
                            userId={props.auth.user.id}
                            schoolYears={props.school_years}
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
