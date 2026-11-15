import { Fragment, useEffect, useState } from "react"
import LineGraph from "@/Components/card/line-graph-statistic"
import ReportFilterModal, { EMPTY_REPORT_FILTER, isUsableReportFilter, reportFilterSummary } from "@/Components/modal/submission-form/report-filter-modal"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import { getProfilePic, showUserType } from "@/others/function"
import { router } from "@inertiajs/react"
import { SlidersHorizontal, X, TriangleAlert, ShieldAlert, CheckCircle2, Percent, Timer, Repeat, FileWarning, FileText } from "lucide-react"
import ViewProgramViolationModal from "@/Components/modal/view/view-program-violation-modal"
import CheckBoxButton from "@/Components/input/checkbox"
import SearchUserBar from "@/Components/input/search-user-bar"
import StatusPill from "@/Components/list/status-pill"
import { readableDate } from "@/others/function"
import SelectedUser from "@/Components/other/selected-user"
import { Avatar, Box, Button, Chip, Divider, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, Skeleton, Typography } from "@mui/material"
import { ChartCard, NoData, BarChart, DoughnutCard } from "@/Components/card/analytics-charts"
import { useThemeMode } from "@/context-provider/theme-mode-provider"

// Analytical Report: all of it from ReportController::buildAnalyticsData()
// (via /prefect/analytics/preview), for all time or the filter's range.

// One color per incident-type line (the backend caps it at 6 types + "Other").
const TREND_COLORS = [
  '#1a237e', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#6b7280',
]
// Dark mode: the navy series would vanish on the dark card; a lighter blue.
const trendColor = (i, dark) => (i % TREND_COLORS.length === 0 && dark ? '#60a5fa' : TREND_COLORS[i % TREND_COLORS.length])

// The filter's selected student, as the student search returns one
// ({ id, role, profile, program, enrollments }): rebuilt from the report's
// data when the page loads with ?student_id=.
const studentFromAnalytics = (id, st) => ({
  id,
  role: "student",
  profile: { first_name: st?.first_name ?? st?.name ?? "", last_name: st?.last_name ?? "", profile_picture: st?.profile_picture, sex: st?.sex },
  program: st?.program ? { code: st.program } : null,
  enrollments: st?.level ? [{ year_level: st.level }] : [],
})
const studentName = (u) => [u?.profile?.first_name, u?.profile?.last_name].filter(Boolean).join(" ")

// Individual report: one student's own analytics (not the school-wide ones).
const StudentAnalytics = ({ p }) => {
  const st = p.student
  return (
    <>
      {/* Who */}
      <section className="bg-white rounded-md shadow-black/20 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <Avatar src={getProfilePic(st.profile_picture, st.sex)} sx={{ width: 56, height: 56 }} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.15em] font-semibold text-gray-900 truncate">{st.name}</h2>
          <p className="text-[0.85em] text-gray-500">{[st.id_number, st.program, st.year_level].filter(Boolean).join(" · ")}</p>
        </div>
        <Button
          variant="outlined"
          size="small"
          onClick={() => router.visit(`/student-violation/${st.encrypted_id}`)}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Open violation record
        </Button>
      </section>

      {/* Key figures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <QuantityCard num={st.total} icon={ShieldAlert} label="Total Violations" />
        <QuantityCard num={st.major} icon={TriangleAlert} label="Major Violations" />
        <QuantityCard num={st.minor} icon={ShieldAlert} label="Minor Violations" />
        <QuantityCard num={p.incidentCount} icon={FileWarning} label="Complaints Against" />
        <QuantityCard num={st.complaints_filed} icon={FileText} label="Complaints Filed" />
        <QuantityCard num={st.repeated_types} icon={Repeat} label="Violation Types Repeated" />
      </div>

      <ChartCard title="Violations per Month" subtitle="When this student's violations happened">
        <BarChart labels={st.trend_labels} values={st.trend_values} colors="#3b82f6" height={260} />
      </ChartCard>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
        <ChartCard title="Violations by Type" subtitle="red = major, amber = minor" className="lg:col-span-2">
          <BarChart
            horizontal
            height={Math.max(160, st.by_type.length * 30)}
            labels={st.by_type.map((t) => (t.name.length > 40 ? `${t.name.slice(0, 39)}…` : t.name))}
            values={st.by_type.map((t) => t.total)}
            colors={st.by_type.map((t) => (t.major ? "#ef4444" : "#f59e0b"))}
          />
        </ChartCard>
        <DoughnutCard title="Severity" items={[{ label: "Major", total: st.major }, { label: "Minor", total: st.minor }]} colors={["#ef4444", "#f59e0b"]} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        <DoughnutCard title="Complaints Against" subtitle="Their status"
          items={p.complaintStatus.filter((s) => s.total > 0)}
          colors={p.complaintStatus.filter((s) => s.total > 0).map((s) => STATUS_COLORS[s.status])} />

        {/* Their record */}
        <section className="lg:col-span-2 min-w-0 grid gap-2">
          <h2 className="text-[1em] font-semibold text-gray-900">Violation Record</h2>
          <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
            {st.violations.length === 0 ? <NoData /> : (
              <List disablePadding sx={{ maxHeight: "24rem", overflowY: "auto" }}>
                {st.violations.map((v, i) => (
                  <Fragment key={i}>
                    {i > 0 && <Divider component="li" />}
                    <ListItem sx={{ gap: 1.5 }}>
                      <Box sx={{ flexShrink: 0, fontSize: "0.72rem", width: 52 }}>
                        <StatusPill status={v.major ? "major" : "minor"} />
                      </Box>
                      <ListItemText
                        primary={v.name}
                        secondary={[v.case_number && `Case #${v.case_number}`, v.issued_at && readableDate(v.issued_at)].filter(Boolean).join(" · ")}
                        slotProps={{ primary: { fontSize: "0.88rem", fontWeight: 500 }, secondary: { fontSize: "0.75rem" } }}
                      />
                    </ListItem>
                  </Fragment>
                ))}
              </List>
            )}
          </Paper>
        </section>
      </div>
    </>
  )
}

const STATUS_COLORS = { pending: "#eab308", ongoing: "#f97316", resolved: "#22c55e", rejected: "#ef4444", revoked: "#6b7280" }

const AnalyticalReport = (props) => {
  const dark = useThemeMode().mode === "dark"
  // Edited in a modal (Filter button). The school years here are plain
  // "2025-2026" strings, so the year itself doubles as the modal's id.
  // The filter lives in the URL (?filter_by=&school_year=&semester= or
  // ?filter_by=date&date_from=&date_to=), so a refresh keeps it.
  const [filter, setFilter] = useState(() => {
    const q = new URLSearchParams(window.location.search)
    return {
      ...EMPTY_REPORT_FILTER,
      filter_by: q.get("filter_by") || EMPTY_REPORT_FILTER.filter_by,
      date_from: q.get("date_from") ?? "",
      date_to: q.get("date_to") ?? "",
      school_year_id: q.get("school_year") ?? "",
      semester: q.get("semester") ?? "",
      // Individual (students only): ?student_id=<encrypted id>; the name
      // comes back with the data.
      individual: !!q.get("student_id"),
      student: q.get("student_id") ? studentFromAnalytics(q.get("student_id"), props.analytics?.student) : null,
    }
  })
  const [studentSearch, setStudentSearch] = useState("")
  const [filterModal, openFilterModal] = useState(false)
  const schoolYears = (props.schoolYears ?? []).map((y) => ({ id: y, year: y }))

  const toRequest = (f) => ({
    filter_by: f.filter_by,
    date_from: f.filter_by === 'date' ? f.date_from : '',
    date_to: f.filter_by === 'date' ? f.date_to : '',
    school_year: f.filter_by === 'school_year' ? f.school_year_id : '',
    semester: f.filter_by === 'school_year' ? f.semester : '',
    student_id: f.individual && f.student ? f.student.id : '',
  })
  const data = toRequest(filter)
  // A range, or one student (then all time is allowed).
  const canApply = (f) => (f.individual ? Boolean(f.student) : isUsableReportFilter(f))
  const hasUsableFilter = canApply(filter)
  const filterSummary = (f) => {
    const range = isUsableReportFilter(f) ? reportFilterSummary(f, schoolYears) : "All time"
    return f.individual && f.student ? `${studentName(f.student) || "Student"} · ${range}` : range
  }

  // Individual student, above the date / school year choice.
  const individualFields = (draft, setDraft) => (
    <div className="grid gap-2">
      <CheckBoxButton.CheckBox
        label="Individual student"
        id="analytics_individual"
        name="individual"
        checked={!!draft.individual}
        change={(e) => {
          setDraft((prev) => ({ ...prev, individual: e.target.checked, student: null }))
          setStudentSearch("")
        }}
      />
      {draft.individual && !draft.student &&
      <div className="relative">
        <SearchUserBar
          setSearch={setStudentSearch}
          name="analytics_student"
          search={studentSearch}
          plc="Search Student Name or ID Number"
          handleSearch={(e) => setStudentSearch(e.target.value)}
          lim={5}
          def="Student Not Found"
          withLink={false}
          click={(_, user) => {
            setDraft((prev) => ({ ...prev, student: user }))
            setStudentSearch("")
          }}
          apiLink="/api/all-users/archive-student"
        />
      </div>}
      {draft.individual && draft.student &&
      <SelectedUser
        src={getProfilePic(draft.student.profile?.profile_picture, draft.student.profile?.sex)}
        name={[draft.student.profile?.first_name ?? "", draft.student.profile?.last_name ?? ""]}
        user={draft.student}
        unselect={() => setDraft((prev) => ({ ...prev, student: null }))}
      />}
      {draft.individual &&
      <p className="text-[0.78em] text-gray-500">Leave the dates empty for the student's whole record.</p>}
    </div>
  )

  // Everything on the page comes from /prefect/analytics/preview: all time
  // with no filter, else the filter's range.
  // The data comes with the page (ReportController::analyticsFor, the
  // "analytics" prop); a filter change is an Inertia visit that reloads
  // only that prop. No API call, on load, refresh or filter.
  const [loading, setLoading] = useState(false)
  const preview = loading ? null : props.analytics
  const load = (request) => {
    const query = Object.fromEntries(Object.entries(request).filter(([, v]) => v))
    router.get(window.location.pathname, query, {
      only: ["analytics"],
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => setLoading(true),
      onFinish: () => setLoading(false),
    })
  }

  const clearFilter = () => {
    setFilter(EMPTY_REPORT_FILTER)
    load({})
  }
  const applyFilter = (next) => {
    if (!canApply(next)) return
    setFilter(next)
    load(toRequest(next))
  }

  const [programModal, setProgramModal] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const openProgramDetail = (program) => {
    setSelectedProgram(program)
    setProgramModal(true)
  }

  const p = preview
  const programs = p?.violationPerProgram ?? []
  const fullName = (u) => [u?.profile?.first_name, u?.profile?.middle_name, u?.profile?.last_name].filter(Boolean).join(" ")

  return (
    <div className="w-full grid gap-4 sm:gap-5">
      <ReportFilterModal
        close={filterModal}
        closeModal={openFilterModal}
        value={filter}
        schoolYears={schoolYears}
        onApply={applyFilter}
        onClear={clearFilter}
        extraFields={individualFields}
        canApply={canApply}
      />
      <ViewProgramViolationModal
        close={programModal}
        closeModal={setProgramModal}
        isEnableOuterClose={true}
        program={selectedProgram}
        dateFrom={data.date_from}
        dateTo={data.date_to}
      />

      {/* Filter (right). The PDF is generated from the Report Generator
          (Analytical Report type), with its progress shown there. */}
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
        <p className="text-gray-500 text-[0.85em]">{hasUsableFilter ? "" : "Showing all time."}</p>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasUsableFilter &&
          <span className="flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
            <span className="truncate">{filterSummary(filter)}</span>
            <button type="button" onClick={clearFilter} title="Clear filter" aria-label="Clear filter"
              className="grid place-items-center w-5 h-5 rounded-full hover:bg-blue-100">
              <X size={13} />
            </button>
          </span>}
          <button
            type="button"
            onClick={() => openFilterModal(true)}
            className={`flex items-center gap-2 px-4 py-2 text-[0.9em] rounded border transition-colors ${
              hasUsableFilter ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal size={16} /> Filter
          </button>
        </div>
      </div>

      {!p ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} variant="rounded" height={96} />)}
          </div>
          <Skeleton variant="rounded" height={340} />
          <div className="grid lg:grid-cols-2 gap-4"><Skeleton variant="rounded" height={300} /><Skeleton variant="rounded" height={300} /></div>
        </div>
      ) : p.student ? (
        <StudentAnalytics p={p} />
      ) : (
      <>
        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
          <QuantityCard num={p.incidentCount} icon={TriangleAlert} label="Total Incidents" />
          <QuantityCard num={p.totalViolations} icon={ShieldAlert} label="Total Violations" />
          <QuantityCard num={p.resolved} icon={CheckCircle2} label="Resolved Complaints" />
          <QuantityCard num={`${p.resolutionRate}%`} icon={Percent} label="Resolution Rate" />
          <QuantityCard num={p.avgResolutionDays != null ? `${p.avgResolutionDays} days` : "—"} icon={Timer} label="Avg. Time to Resolve" />
          <QuantityCard num={`${p.repeatOffenders} of ${p.studentsWithViolations}`} icon={Repeat} label={`Repeat Offenders (${p.repeatRate}%)`} />
        </div>

        {/* Trend */}
        <ChartCard title="Incident Trend" subtitle="Complaints filed per month, by incident type">
          <div className="h-[20rem]">
            <LineGraph
              label={p.incidentTrendLabels ?? []}
              dataset={(p.incidentTrendSeries ?? []).map((s, i) => ({
                label: s.label,
                data: s.data,
                borderColor: trendColor(i, dark),
                backgroundColor: trendColor(i, dark),
                fill: false,
                tension: 0.3,
              }))}
              xTitle="Month"
              yTitle="Incidents"
              bg="!px-0 !py-0"
            />
          </div>
        </ChartCard>

        {/* Who: program and year level */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
          <ChartCard title="Violations per Program" subtitle="Click a bar to see the students">
            <BarChart
              labels={programs.map((e) => e.program)}
              values={programs.map((e) => Number(e.total_violations))}
              onBarClick={openProgramDetail}
            />
          </ChartCard>
          <ChartCard title="Violations per Year Level">
            <BarChart
              labels={p.violationsByYearLevel.map((e) => e.label)}
              values={p.violationsByYearLevel.map((e) => e.total)}
              colors="#6366f1"
            />
          </ChartCard>
        </div>

        {/* Breakdowns */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          <DoughnutCard title="Complaint Status" subtitle="Every complaint filed in the period"
            items={p.complaintStatus.filter((s) => s.total > 0)}
            colors={p.complaintStatus.filter((s) => s.total > 0).map((s) => STATUS_COLORS[s.status])} />
          <DoughnutCard title="Severity" subtitle="Major vs minor violations"
            items={p.violationsBySeverity} colors={["#ef4444", "#f59e0b"]} />
          <DoughnutCard title="Violations by Sex"
            items={p.violationsBySex} colors={["#3b82f6", "#ec4899", "#9ca3af"]} />
        </div>

        {/* What and when */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
          <ChartCard title="Most Common Violations" subtitle="Top 10 by number of violations · red = major, amber = minor">
            <BarChart
              horizontal
              height={Math.max(160, p.topViolationTypes.length * 30)}
              labels={p.topViolationTypes.map((t) => (t.name.length > 34 ? `${t.name.slice(0, 33)}…` : t.name))}
              values={p.topViolationTypes.map((t) => t.total)}
              colors={p.topViolationTypes.map((t) => (t.major ? "#ef4444" : "#f59e0b"))}
            />
          </ChartCard>
          <ChartCard title="Incidents by Day of the Week" subtitle="When complaints are filed">
            <BarChart
              labels={p.incidentsByWeekday.map((d) => d.label)}
              values={p.incidentsByWeekday.map((d) => d.total)}
              colors="#0ea5e9"
            />
          </ChartCard>
        </div>

        {/* Top violators */}
        <div className="grid gap-4 sm:gap-5">
          <div className="min-w-0 grid gap-2">
            <h2 className="text-[1em] font-semibold text-gray-900">Top 5 Violators</h2>
            <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
              {p.top5Students.length === 0 ? <NoData /> : (
                <List disablePadding>
                  {p.top5Students.map((v, i) => (
                    <Fragment key={i}>
                      {i > 0 && <Divider component="li" />}
                      <ListItemButton onClick={() => router.visit(`/student-violation/${v.user.encrypted_id}`)}>
                        <Typography sx={{ width: 22, fontWeight: 700, color: "primary.main" }}>{i + 1}</Typography>
                        <ListItemAvatar sx={{ minWidth: 48 }}>
                          <Avatar src={getProfilePic(v.user.profile?.profile_picture, v.user.profile?.sex)} sx={{ width: 36, height: 36 }} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={fullName(v.user)}
                          secondary={showUserType(v.user)}
                          slotProps={{ primary: { noWrap: true, fontWeight: 600, fontSize: "0.9rem" }, secondary: { noWrap: true, fontSize: "0.75rem" } }}
                        />
                        <Chip size="small" color="error" variant="outlined" label={`${v.total_offenses} violation${v.total_offenses == 1 ? "" : "s"}`} />
                      </ListItemButton>
                    </Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </div>
        </div>
      </>
      )}
    </div>
  )
}

export default AnalyticalReport
