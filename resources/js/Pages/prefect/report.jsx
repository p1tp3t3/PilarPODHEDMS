import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import ReportStatistics from "./report/report-statistics"
import AuthLayout from "@/Layouts/auth-layout"
import { router } from "@inertiajs/react"
import useListData, { reloadListData, setListQuery } from "@/others/hooks/use-list-data"
import { useEffect, useRef, useState } from "react"
import ReportFilterModal, { EMPTY_REPORT_FILTER, isUsableReportFilter, reportFilterSummary } from "@/Components/modal/submission-form/report-filter-modal"
import ArchiveList from "@/Components/list/archive-list"
import ReportGenerator from "@/Components/report-generator/report-generator"
import axios from "axios"
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
import { Button, IconButton } from "@mui/material"

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
        // Report Generator: create a report's filter, then generate it (URL kept).
        'saved-filters': { key: 'saved-filters', label: 'Report Generator' },
        // Generated Reports: the Report Generator's second tab (URL kept).
        'generated': { key: 'generated-reports', label: 'Report Generator' },
    }
    const current = SECTIONS[props.section] ?? SECTIONS.incident
    const choose = current.key
    // Report Generator tabs: switched in place (the address bar follows),
    // so a filter's generation progress keeps running on the other tab.
    const isGenerator = choose === 'saved-filters' || choose === 'generated-reports'
    const [generatorTab, setGeneratorTab] = useState(choose)
    const switchGeneratorTab = (key) => {
        setGeneratorTab(key)
        window.history.replaceState(window.history.state, '', key === 'generated-reports' ? '/prefect/report/generated' : '/prefect/report/saved-filters')
    }
    // Report-type pages have two tabs: the records table and its statistics.
    const isReportType = ['incident', 'violation', 'tardy', 'appointment', 'gatepass'].includes(props.section)
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

    // The address bar follows; the table and statistics are fetched again
    // from the API (no page request).
    const reloadWith = (query) =>
        setListQuery(Object.fromEntries(Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '')))

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

          [archive_list, setArchiveList] = useState(props.archive)

    // The section's table (Report Generator: the saved filters) loads from
    // /api/prefect/report/{section} once the page opens, and again after a
    // filter change or a reload; every row, paginated in the browser. The
    // Analytical Report has no table (its data comes with the page).
    const { data: lists } = useListData(null, null, { enabled: choose !== 'analytics' })
    const report_list = lists?.report ?? null
    const violation_report_list = lists?.violation_report?.data ?? null
    const tardy_report_list = lists?.tardy_report ?? null
    const appointment_report_list = lists?.appointment_report ?? null
    const gatepass_report_list = lists?.gatepass_report ?? null
    // After a report is deleted/changed: the table is fetched again.
    const setReportList = () => reloadListData()

    // Saved report filters — a reusable preset instead of the old
    // "generate a file right away" modal. `editingFilter` is null for
    // "create a new one"; the Saved Filters tab's Edit action sets it
    // before opening the same modal, and it's cleared again the moment the
    // modal closes so a later "+ New Filter" click never reopens stale
    // edit state.
    // Saved filters: from the page's API (above); after a save, edit or
    // delete the list is fetched again.
    const generatorLists = isGenerator && lists ? lists : null
    const [editingFilter, setEditingFilter] = useState(null)

    const loadReportFilters = () => reloadListData()

    const { loadRegister } = useReload()
    const contentRef = useRef()

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
                        {isReportType &&
                        // The Filter button shares the tab bar's line (wider screens).
                        <div className="relative grid gap-3 min-w-0">
                        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 sm:absolute sm:right-0 sm:top-0 sm:h-10 sm:max-w-[60%] z-[1]">
                            {hasFilter &&
                            <span className="flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
                                <span className="truncate">{filterSummary}</span>
                                <IconButton
                                    size="small"
                                    onClick={clearFilter}
                                    title="Clear filter"
                                    aria-label="Clear filter"
                                    sx={{ p: 0.25, color: "inherit", "&:hover": { bgcolor: "var(--tone-blue-bg)" } }}
                                >
                                    <X size={13} />
                                </IconButton>
                            </span>}
                            <Button
                                variant={hasFilter ? "contained" : "outlined"}
                                disableElevation
                                onClick={() => openFilterModal(true)}
                                startIcon={<SlidersHorizontal size={16} />}
                                sx={{
                                    textTransform: "none", fontSize: "0.9em", borderRadius: "0.375rem", px: 2,
                                    ...(hasFilter
                                        ? { bgcolor: "#2563eb", "&:hover": { bgcolor: "var(--tone-blue-fg)" } }
                                        : { bgcolor: "background.paper", color: "var(--tone-gray-fg)", borderColor: "#d1d5db", "&:hover": { bgcolor: "var(--tone-gray-bg)", borderColor: "#9ca3af" } }),
                                }}
                            >
                                Filter
                            </Button>
                        </div>
                        <TabSwitcher
                            tabs={[
                                { key: 'records', label: 'Records' },
                                { key: 'statistics', label: 'Statistics' },
                            ]}
                            value={view}
                            onChange={setView}
                        />
                        </div>}
                        {isReportType && view === 'statistics' &&
                        <ReportStatistics stats={lists?.report_stats ?? null} />}
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
                            analytics={props.analytics}
                            quantity={[props.incident, props.resolved, props.violation_count]}
                            top5Student={props.top5_students}
                            incidentLineGraph={props.incident_line_graph}
                            incidentTrendSeries={props.incident_trend_series}
                            incidentTrendLabels={props.incident_trend_labels}
                            violationProgram={props.violation_program}
                            userId={props.auth.user.id}
                            schoolYears={props.school_years}
                        />}
                        {/* Report Generator: shared with the super admin (@/Components/report-generator). */}
                        {isGenerator &&
                        <ReportGenerator
                            tab={generatorTab === 'generated-reports' ? 'generated' : 'filters'}
                            onTabChange={(key) => switchGeneratorTab(key === 'generated' ? 'generated-reports' : 'saved-filters')}
                            filters={generatorLists?.filters ?? null}
                            generated={generatorLists?.generated ?? null}
                            typeOptions={[
                                { val: 'incident', label: 'Incident Report' },
                                { val: 'violation', label: 'Violation Report' },
                                { val: 'tardy', label: 'Tardy Report' },
                                { val: 'appointment', label: 'Appointment Report' },
                                { val: 'gatepass', label: 'Gate Pass Report' },
                                { val: 'analytics', label: 'Analytical Report' },
                            ]}
                            schoolYears={props.school_years ?? []}
                            canExcel={(row) => row.report_type !== 'analytics'}
                            generate={(id, fileType) => axios.post(`/prefect/report-filter/${id}/generate`, { file_type: fileType })}
                            deleteFilter={(id) => axios.post(`/prefect/report-filter/${id}/delete`)}
                            deleteReport={(id) => axios.post(`/prefect/report/delete/${id}`)}
                            onNew={() => { setEditingFilter(null); openGenerateReport(true) }}
                            onEdit={(row) => { setEditingFilter({ id: row.id, name: row.name, report_type: row.report_type, filters: row.filters }); openGenerateReport(true) }}
                            onChanged={loadReportFilters}
                        />}
                    </div>
            </PageLayout>
        </>
    )
}

PrefectReport.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectReport
