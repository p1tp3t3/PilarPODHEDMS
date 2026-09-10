import { useEffect, useState } from "react"
import Btn from "@/Components/button/normal-btn"
import { DataGrid } from "@mui/x-data-grid"
import Box from "@mui/material/Box"
import LineGraph from "@/Components/card/line-graph-statistic"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import ProfilePic from "@/Components/other/profile-pic"
import { change, getProfilePic, showUserType, configBroadcast } from "@/others/function"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { router } from "@inertiajs/react"
import { UserX } from "lucide-react"

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
]

const AnalyticalReport = (props) => {
  const [data, setData] = useState({
    date_from: "",
    date_to: "",
  })

  // On-screen preview data. Defaults to what the controller already
  // computed for the current year; refreshed from /prefect/analytics/preview
  // once both dates are picked, so the filter actually affects the screen
  // instead of only the PDF export.
  const [preview, setPreview] = useState({
    quantity: props.quantity,
    violationProgram: props.violationProgram,
    top5Student: props.top5Student,
    incidentTrendLabels: monthNames.slice(0, props.incidentLineGraph.length),
    incidentTrendValues: props.incidentLineGraph,
  })

  const [exportStatus, setExportStatus] = useState('idle') // idle | queued | ready | failed
  const [exportUrl, setExportUrl] = useState(null)
  const [exportViewUrl, setExportViewUrl] = useState(null)

  useEffect(() => {
    if (!data.date_from || !data.date_to) return

    ReportArchiveService.getAnalyticsPreview(data, (res) => {
      setPreview({
        quantity: [res.incidentCount, res.resolved, res.totalViolations],
        violationProgram: res.violationPerProgram,
        top5Student: res.top5Students,
        incidentTrendLabels: (res.incidentTrendLabels ?? []).length
          ? res.incidentTrendLabels
          : monthNames,
        incidentTrendValues: res.incidentTrendValues ?? [],
      })
    })
  }, [data.date_from, data.date_to])

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
    if (!data.date_from || !data.date_to) return

    setExportStatus('queued')
    setExportUrl(null)
    setExportViewUrl(null)

    ReportArchiveService.generateAnalyticReport(data, () => {}, () => setExportStatus('failed'))
  }

  return (
    <div className="w-full">
      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3 mb-6">
        <div className="grid gap-3 w-full">
          <div className="flex flex-wrap gap-3 items-center text-[1em]">
            <input
              type="date"
              name="date_from"
              value={data.date_from}
              onChange={(e) => change(e, setData)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-700">To</span>
            <input
              type="date"
              name="date_to"
              value={data.date_to}
              onChange={(e) => change(e, setData)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
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

        {/* Incident Trend */}
        <div className="mb-8 h-[20rem]">
          <LineGraph
            label={preview.incidentTrendLabels}
            dataset={[{
              label: 'Incidents',
              data: preview.incidentTrendValues,
              borderColor: '#1a237e',
              backgroundColor: 'rgba(26,35,126,0.15)',
              fill: true,
              tension: 0.3,
            }]}
            title="Incident Trend"
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

          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <Box sx={{ minWidth: "600px", height: 400 }}>
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
              />
            </Box>
          </Box>
        </div>


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
