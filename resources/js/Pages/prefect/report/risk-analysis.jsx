import { useEffect, useState } from "react"
import Btn from "@/Components/button/normal-btn"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import LineGraph from "@/Components/card/line-graph-statistic"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import ProfilePic from "@/Components/other/profile-pic"
import ReportFilterModal, { EMPTY_REPORT_FILTER, isUsableReportFilter, reportFilterSummary } from "@/Components/modal/submission-form/report-filter-modal"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import { getProfilePic, showUserType, configBroadcast } from "@/others/function"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { router } from "@inertiajs/react"
import { UserX, SlidersHorizontal, X, TriangleAlert, ShieldAlert, CheckCircle2 } from "lucide-react"
import ViewProgramViolationModal from "@/Components/modal/view/view-program-violation-modal"

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
]

// One color per incident-type line — the backend caps series at 6 types
// plus "Other", so 7 distinct colors cover every case without repeats.
const TREND_COLORS = [
  '#1a237e', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#6b7280',
]

const AnalyticalReport = (props) => {
  // Edited in a modal (Filter button). The school years here are plain
  // "2025-2026" strings, so the year itself doubles as the modal's id.
  const [filter, setFilter] = useState(EMPTY_REPORT_FILTER)
  const [filterModal, openFilterModal] = useState(false)
  const schoolYears = (props.schoolYears ?? []).map((y) => ({ id: y, year: y }))

  const toRequest = (f) => ({
    filter_by: f.filter_by,
    date_from: f.filter_by === 'date' ? f.date_from : '',
    date_to: f.filter_by === 'date' ? f.date_to : '',
    school_year: f.filter_by === 'school_year' ? f.school_year_id : '',
    semester: f.filter_by === 'school_year' ? f.semester : '',
  })
  const data = toRequest(filter)

  const hasUsableFilter = isUsableReportFilter(filter)

  // On-screen preview data. Defaults to what the controller already
  // computed for the current year; refreshed from /prefect/analytics/preview
  // once both dates are picked, so the filter actually affects the screen
  // instead of only the PDF export.
  const defaultPreview = () => ({
    quantity: props.quantity,
    violationProgram: props.violationProgram,
    top5Student: props.top5Student,
    incidentTrendLabels: (props.incidentTrendLabels ?? []).length
      ? props.incidentTrendLabels
      : monthNames.slice(0, props.incidentLineGraph.length),
    incidentTrendSeries: props.incidentTrendSeries ?? [],
  })

  const [preview, setPreview] = useState(defaultPreview)

  const clearFilter = () => {
    setFilter(EMPTY_REPORT_FILTER)
    setPreview(defaultPreview())
  }

  const [exportStatus, setExportStatus] = useState('idle') // idle | queued | ready | failed
  const [exportUrl, setExportUrl] = useState(null)
  const [exportViewUrl, setExportViewUrl] = useState(null)

  const [programModal, setProgramModal] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)

  const openProgramDetail = (program) => {
    setSelectedProgram(program)
    setProgramModal(true)
  }

  // Applied from the filter modal: refreshes the on-screen preview.
  const applyFilter = (next) => {
    if (!isUsableReportFilter(next)) return
    setFilter(next)

    ReportArchiveService.getAnalyticsPreview(toRequest(next), (res) => {
      setPreview({
        quantity: [res.incidentCount, res.resolved, res.totalViolations],
        violationProgram: res.violationPerProgram,
        top5Student: res.top5Students,
        incidentTrendLabels: (res.incidentTrendLabels ?? []).length
          ? res.incidentTrendLabels
          : monthNames,
        incidentTrendSeries: res.incidentTrendSeries ?? [],
      })
    })
  }

  useEffect(() => {
    if (!props.userId) return

    configBroadcast(
      'private',
      `job-status.progress.user.${props.userId}`,
      'Analytics report status',
      '.ReportGenerated',
      (e) => {
        if (e.status === 'ready') {
          setExportStatus('ready')
          setExportUrl(e.download_url)
          setExportViewUrl(e.view_url)
        } else if (e.status === 'failed') {
          setExportStatus('failed')
        }
      }
    )
  }, [props.userId])

  const handleExport = () => {
    if (!hasUsableFilter) return

    setExportStatus('queued')
    setExportUrl(null)
    setExportViewUrl(null)

    ReportArchiveService.generateAnalyticReport(data, () => {}, () => setExportStatus('failed'))
  }

  return (
    <div className="w-full">
      <ReportFilterModal
        close={filterModal}
        closeModal={openFilterModal}
        value={filter}
        schoolYears={schoolYears}
        onApply={applyFilter}
        onClear={clearFilter}
      />

      {/* Export (left) and Filter (right): the same bar as the super admin's Statistics. */}
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Btn onclick={handleExport}>
            {exportStatus === 'queued' ? 'Generating…' : 'Export as PDF'}
          </Btn>
          {exportStatus === 'ready' && exportUrl &&
          <>
            {exportViewUrl &&
            <a
              href={exportViewUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded border border-green-600 text-green-700 text-[0.9em] hover:bg-green-50"
            >
              View
            </a>}
            <a
              href={exportUrl}
              className="px-3 py-1.5 rounded bg-green-600 text-white text-[0.9em] hover:bg-green-700"
            >
              Download
            </a>
          </>}
          {exportStatus === 'failed' &&
          <span className="text-red-600 text-[0.85em]">Failed to generate report.</span>}
          {!hasUsableFilter &&
          <span className="text-gray-500 text-[0.85em]">Set a filter to export.</span>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasUsableFilter &&
          <span className="flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
            <span className="truncate">{reportFilterSummary(filter, schoolYears)}</span>
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
              hasUsableFilter
                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal size={16} /> Filter
          </button>
        </div>
      </div>

      {/* Key metrics: the same cards as the dashboards' quantity cards. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <QuantityCard h="h-[6rem]" num={preview.quantity[0] ?? 0} icon={TriangleAlert} label="Total Incidents" />
        <QuantityCard h="h-[6rem]" num={preview.quantity[2] ?? 0} icon={ShieldAlert} label="Total Violations" />
        <QuantityCard h="h-[6rem]" num={preview.quantity[1] ?? 0} icon={CheckCircle2} label="Resolved Complaints" />
      </div>

      {/* Report Body */}
      <div className="w-full mx-auto p-4 sm:p-6 bg-white shadow-black/20 shadow-sm rounded-md">
        {/* Incident Trend (per incident type) */}
        <div className="mb-8 h-[22rem]">
          <LineGraph
            label={preview.incidentTrendLabels}
            dataset={preview.incidentTrendSeries.map((s, i) => ({
              label: s.label,
              data: s.data,
              borderColor: TREND_COLORS[i % TREND_COLORS.length],
              backgroundColor: TREND_COLORS[i % TREND_COLORS.length],
              fill: false,
              tension: 0.3,
            }))}
            title="Incident Trend Per Type"
            xTitle="Month"
            yTitle="Incidents"
            withBorder
          />
        </div>

        {/* Violations per Program */}
        <div className="mb-8">
          <h2 className="text-[1.1em] mb-4 font-bold">Violations Per Program</h2>

          {preview.violationProgram.length > 0 &&
          <div className="mb-5">
            {/* Fixed chart height so it stays inside its card; the section
                heading above already names it. */}
            <BarGraph
              label={preview.violationProgram.map((e) => e.program)}
              dataset={[{
                label: 'Total Violations',
                data: preview.violationProgram.map((e) => e.total_violations),
                backgroundColor: '#3b82f6',
              }]}
              height={260}
              withBorder
            />
          </div>}

          <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", height: 400 }}>
            <DataGrid
              rows={preview.violationProgram.map((e, i) => ({ id: i, ...e }))}
              columns={[
                { field: "index", headerName: "#", width: 60, valueGetter: (v, row) => row.id + 1 },
                { field: "program", headerName: "Program", flex: 1, minWidth: 200 },
                { field: "students_with_violations", headerName: "Students With Violations", width: 210 },
                { field: "total_violations", headerName: "Total Violations", width: 160 },
              ]}
              hideFooter
              disableRowSelectionOnClick
              showToolbar
              onRowClick={(params) => openProgramDetail(params.row.program)}
              sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />
          </Box>
        </div>

        <ViewProgramViolationModal
          close={programModal}
          closeModal={setProgramModal}
          isEnableOuterClose={true}
          program={selectedProgram}
          dateFrom={data.date_from}
          dateTo={data.date_to}
        />


        {/* Top Violators */}
<div className="mb-8">
  <h2 className="text-[1.2em] mb-4 font-bold text-blue-700 flex items-center gap-2">
    <UserX size="1em" className="text-blue-600" />
    Top 5 Violators
  </h2>

  <div className="space-y-3">
    {preview.top5Student.map((violator, index) => (
      <div
        key={index}
        className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border border-gray-300 bg-white shadow-sm hover:shadow-md transition-shadow px-4 py-3 rounded-lg"
        onClick={() => router.visit(`/student-violation/${violator.user.encrypted_id}`)}
      >
        {/* Left Side (Rank + Profile) */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-700 text-[1em] w-6 text-center">
            {index + 1}.
          </span>

          <ProfilePic
            size={2.3}
            src={getProfilePic(
              violator.user.profile?.profile_picture,
              violator.user.profile?.sex
            )}
          />

          <div>
            <h1 className="text-[0.9em] font-semibold text-gray-900 leading-tight">
              {`${violator.user.profile?.first_name ?? ""} ${
                violator.user.profile?.middle_name ? violator.user.profile.middle_name + " " : ""
              }${violator.user.profile?.last_name ?? ""}`}
            </h1>

            <p className="text-[0.75em] text-gray-500">
              {showUserType(violator.user)}
            </p>
          </div>
        </div>

        {/* Violation Count */}
        <span className="text-[0.9em] font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full self-start sm:self-auto">
          {violator.total_offenses} Violations
        </span>
      </div>
    ))}
  </div>
</div>

      </div>
    </div>
  )
}

export default AnalyticalReport
