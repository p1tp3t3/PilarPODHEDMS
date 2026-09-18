import { useEffect, useState } from "react"
import Btn from "@/Components/button/normal-btn"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import LineGraph from "@/Components/card/line-graph-statistic"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import ProfilePic from "@/Components/other/profile-pic"
import RadioButton from "@/Components/input/radio"
import DropdownField from "@/Components/input/dropdown"
import BetweenTextfield from "@/Components/input/between-input"
import { getProfilePic, showUserType, configBroadcast } from "@/others/function"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { router } from "@inertiajs/react"
import { UserX } from "lucide-react"
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

const semesterList = [
  { val: 1, label: "1st Semester" },
  { val: 2, label: "2nd Semester" },
]

const AnalyticalReport = (props) => {
  const [filterBy, setFilterBy] = useState('date')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [semester, setSemester] = useState('')

  const data = {
    filter_by: filterBy,
    date_from: filterBy === 'date' ? dateFrom : '',
    date_to: filterBy === 'date' ? dateTo : '',
    school_year: filterBy === 'school_year' ? schoolYear : '',
    semester: filterBy === 'school_year' ? semester : '',
  }

  const hasUsableFilter = filterBy === 'date' ? (dateFrom && dateTo) : !!schoolYear

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
    setFilterBy('date')
    setDateFrom('')
    setDateTo('')
    setSchoolYear('')
    setSemester('')
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

  // Filter fields no longer fetch on every change — the user sets
  // date range/school year (+semester) first, then explicitly clicks
  // "Apply Filter" to submit it, instead of a request firing on each click.
  const applyFilter = () => {
    if (!hasUsableFilter) return

    ReportArchiveService.getAnalyticsPreview(data, (res) => {
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
      {/* Filter Section */}
      <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-5 grid gap-4 mb-6">
        <RadioButton
          list={[
            { val: "date", label: "Date Range" },
            { val: "school_year", label: "School Year" },
          ]}
          id="analytics_filter_by"
          name="analytics_filter_by"
          val={filterBy}
          change={(e) => {
            setFilterBy(e.target.value)
            setDateFrom("")
            setDateTo("")
            setSchoolYear("")
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
              list={(props.schoolYears ?? []).map((y) => ({ val: y, label: y }))}
              onChange={(e) => setSchoolYear(e.target.value)}
              name="school_year"
              val={schoolYear}
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={applyFilter}
            disabled={!hasUsableFilter}
            className={`text-[0.85em] px-3 py-1.5 rounded text-white ${
              hasUsableFilter ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Apply Filter
          </button>

          {hasUsableFilter &&
          <button
            type="button"
            onClick={clearFilter}
            className="text-[0.85em] text-gray-600 hover:text-gray-900 underline"
          >
            Clear Filter
          </button>}
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Report Body */}
      <div className="w-full mx-auto p-4 sm:p-6 bg-white shadow-black/20 shadow-sm rounded-md">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h2 className="text-lg sm:text-xl font-semibold text-blue-800">Total Incidents</h2>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">
              {preview.quantity[0]}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h2 className="text-lg sm:text-xl font-semibold text-yellow-800">Total Violations</h2>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
              {preview.quantity[2]}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h2 className="text-lg sm:text-xl font-semibold text-green-800">Resolved Complaints</h2>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {preview.quantity[1]}
            </p>
          </div>
        </div>

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
          <div className="mb-5 h-[18rem]">
            <BarGraph
              label={preview.violationProgram.map((e) => e.program)}
              dataset={[{
                label: 'Total Violations',
                data: preview.violationProgram.map((e) => e.total_violations),
                backgroundColor: '#3b82f6',
              }]}
              title="Violations Per Program"
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
        onClick={() => router.visit(`/student-violation/${violator.user.id}`)}
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

            <p className="text-[0.75em] text-gray-500">
              {violator.user.program?.name}
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
