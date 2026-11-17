import TabSwitcher from "@/Components/other/tab-switcher";
import PageLayout from "@/Layouts/page-layout";
import BehaviourAnalysisSkeleton from "@/Components/reload/behaviour-analysis-skeleton";
import AuthLayout from "@/Layouts/auth-layout";
import { readableDate, readableTime, toTitleCase, ordinal, openPdfTabPost } from "@/others/function";
import { Box, Select, MenuItem, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { DataGrid } from "@/Components/other/data-grid";
import { useEffect, useMemo, useState } from "react";
import useListData from "@/others/hooks/use-list-data";
import { ShieldHalf, Clock, FolderOpen, AlertTriangle, CalendarPlus, FileText } from "lucide-react";
import { Button as MuiButton } from "@mui/material";
import axios from "axios";
import { Head } from "@inertiajs/react";
import ActionBtn from "@/Components/button/action-btn";
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal";
import AppointmentModal from "@/Components/modal/submission-form/set-appointment-modal";
import Btn from "@/Components/button/normal-btn";
import { useReload } from "@/context-provider/reload-provider";
import BreadcrumbNav from "@/Components/other/breadcrumb-nav";
import { ContributingFactors, Recommendations, toneOf } from "@/Components/card/behaviour-analysis-parts";
import StudentHeaderCard from "@/Components/card/student-header-card";

// offense_issued_at is only set once a prefect actually issues the offense —
// until then (or in seeded/demo data) it's null. Fall back to whichever
// complaint-lifecycle timestamp is actually available, same order used for
// the ML model's own date input on the backend.
const bestComplaintDate = (complaint) =>
  complaint?.offense_issued_at || complaint?.resolved_at || complaint?.confirmed_at || complaint?.created_at || null;

/* ===============================
   MAIN COMPONENT
================================ */
const StudentViolation = (props, { user = demoProps.user, student = demoProps.student, violations = demoProps.violations}) => {
    // The Recent Violations table loads from /api/student-violation/{id}
    // once the page opens.
    const { data: lists } = useListData()
  // ?tab=analysis&violation=<id> (e.g. from the prefect's Watch List) opens
  // Behavioural Analysis with that violation already selected.
  const [option, setOption] = useState(() =>
    new URLSearchParams(window.location.search).get('tab') === 'analysis' ? 'analysis' : 'recent_violations'
  )

  // Prefect: book a consultation with this student as an intervention.
  const viewer = props.auth?.user ?? props.user
  const isPrefect = viewer?.role === 'sub_admin'
  const [appointOpen, setAppointOpen] = useState(false)
  const { loadRegister } = useReload()

  // Path back to where this page was opened from: the dashboard's Watch
  // List, a violation's student list, or (default) Violation Management.
  const studentName = [props.student?.profile?.first_name, props.student?.profile?.last_name].filter(Boolean).join(" ") || "Student"
  const fromDashboard = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("from") === "dashboard"
  const crumbs = fromDashboard || !['sub_admin', 'super_admin'].includes(viewer?.role)
    ? [{ label: "Dashboard", href: "/dashboard" }]
    : [
        ...(props.from_violation
          ? [{ label: "Violations", href: "/violation-management/violations" }, { label: props.from_violation.name, href: props.from_violation.href }]
          : [{ label: "Student Violations", href: "/violation-management/student-violations" }]),
      ]

  const optionList = [
    { key: 'recent_violations', label: 'Recent Violations' },
    { key: 'analysis', label: 'Behavioural Analysis' },
  ]

  return (
        <>
        <Head title="Student Violation" />
        {isPrefect && (
          <AppointmentModal
            label="Set Appointment"
            close={appointOpen}
            closeModal={setAppointOpen}
            pd={["px-5", "py-7"]}
            isEnableOuterClose={true}
            id={viewer.id}
            user_type={viewer.role}
            reload={loadRegister}
            lockedUser={{ ...props.student, role: props.student.role ?? 'student' }}
            defaultReason="<p>Consultation with the Prefect of Discipline regarding your recent violations, as an early intervention.</p>"
          />
        )}
        <div className="pt-4">
          <BreadcrumbNav items={[...crumbs, { label: studentName }]} />
        </div>
        <PageLayout
          title="STUDENT VIOLATION"
        >
                <StudentHeaderCard student={props.student} />
                <div className="mt-2">
                    <TabSwitcher tabs={optionList} value={option} onChange={setOption} />
                    <div className="mt-6">
                        {option === "recent_violations" ? (
                            <RecentViolation violations={lists?.student_violations ?? null} user={props.auth?.user ?? props.user} />
                        ) : (
                            <BehaviourAnalysis
                                studentId={props.student.id}
                                violation_list={props.violations}
                                model_inputs={props.model_inputs}
                                violation_timelines={props.violation_timelines}
                                // Set Appointment sits in the verdict card,
                                // for the prefect, when it says "Likely".
                                onAppoint={isPrefect ? () => setAppointOpen(true) : null}
                            />
                        )}
                    </div>
                </div>
        </PageLayout>
        </>
  );
}

StudentViolation.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

/* ===============================
   RECENT VIOLATIONS TABLE
================================ */
const RecentViolation = ({ violations, user }) => {
  // "View" opens the complaint behind a violation — why it was given.
  const [complaintKey, setComplaintKey] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  // Grouped: one row per violation with its offenses listed. Ungrouped: one
  // row per offense. The choice is remembered on this browser.
  const [grouped, setGrouped] = useState(() => localStorage.getItem("student-violations-view") !== "ungrouped");
  const changeView = (_, v) => {
    if (v == null) return;
    setGrouped(v === "grouped");
    localStorage.setItem("student-violations-view", v);
  };

  const openComplaint = (key) => {
    setComplaintKey(key);
    setViewOpen(true);
  };

  const penaltyLabel = (penalty) =>
    penalty
      ? `${penalty.ref_number != null ? `${penalty.ref_number} — ` : ""}${toTitleCase(penalty.description ?? "")}`
      : null;

  const columns = [
    {
      field: "index",
      headerName: "#",
      width: 60,
      sortable: false,
      renderCell: (params) => `${params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}.`,
    },
    {
      field: "violation_name",
      headerName: "Violation",
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <div className="py-3 whitespace-normal leading-snug">
          <div className="font-semibold text-gray-900">{row.violation_name}</div>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[0.8em] font-semibold ${
              row.offense_status === 1 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {row.offense_status === 1 ? "Major" : "Minor"}
          </span>
        </div>
      ),
    },
    {
      field: "occurrence_count",
      headerName: "Occurrences",
      width: 120,
      renderCell: ({ value }) => (
        <span className="font-semibold text-gray-800">{value} time{value === 1 ? "" : "s"}</span>
      ),
    },
    {
      field: "current_penalty",
      headerName: "Current Penalty",
      flex: 1,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="py-3 whitespace-normal leading-snug">
          {row.current_penalty ? (
            <span className="text-gray-900 font-medium">{row.current_penalty}</span>
          ) : (
            <span className="italic text-gray-400">No penalty set</span>
          )}
        </div>
      ),
    },
    {
      field: "occurrences",
      headerName: "Each Occurrence",
      flex: 1.6,
      minWidth: 340,
      sortable: false,
      filterable: false,
      // Every time it happened: which offense, its penalty, when, and a
      // View for the complaint behind it.
      renderCell: ({ row }) => (
        <ol className="py-3 grid gap-2 w-full">
          {row.occurrences.map((o) => (
            <li key={o.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0 whitespace-normal leading-snug">
                <div className="text-gray-800">
                  <span className="font-semibold">{o.occurrence ? `${ordinal(o.occurrence)} offense` : "Offense"}</span>
                  {" — "}
                  {o.penalty ?? <span className="italic text-gray-400">No penalty set</span>}
                </div>
                <div className="text-[0.85em] text-gray-500">
                  {o.date ? `${readableDate(o.date)} • ${readableTime(o.date)}` : "No date"}
                </div>
              </div>
              <ActionBtn
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!o.complaint_key}
                title="View the complaint behind this offense"
                onClick={() => openComplaint(o.complaint_key)}
              >
                View
              </ActionBtn>
            </li>
          ))}
        </ol>
      ),
    },
  ];

  // One row per violation; its offenses listed oldest (1st) first. The
  // violations themselves are ordered by their most recent offense.
  const rows = Object.values(
    (violations ?? []).reduce((acc, v) => {
      const id = v.violation_id ?? v.violation?.id;
      (acc[id] ??= { violation: v.violation, records: [] }).records.push(v);
      return acc;
    }, {})
  )
    .map(({ violation, records }) => {
      const occurrences = records
        .map((v, k) => ({
          key: `${v.complaint_id}-${k}`,
          occurrence: v.occurrence,
          penalty: penaltyLabel(v.penalty),
          date: bestComplaintDate(v.complaint),
          complaint_key: v.complaint_key,
        }))
        .sort((a, b) => (a.occurrence ?? 0) - (b.occurrence ?? 0) || new Date(a.date ?? 0) - new Date(b.date ?? 0));
      const latest = occurrences[occurrences.length - 1];
      return {
        violation_name: violation?.violation_name,
        offense_status: violation?.offense_status,
        occurrence_count: occurrences.length,
        current_penalty: latest?.penalty ?? null,
        last_date: occurrences.reduce((m, o) => Math.max(m, new Date(o.date ?? 0).getTime()), 0),
        occurrences,
      };
    })
    .sort((a, b) => b.last_date - a.last_date)
    .map((r, i) => ({ id: i + 1, ...r }));
  const offenseTotal = (violations ?? []).length;

  // Ungrouped: every offense on its own row, newest first.
  const violationCell = ({ row }) => (
    <div className="py-3 whitespace-normal leading-snug">
      <div className="font-semibold text-gray-900">{row.violation_name}</div>
      <span
        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[0.8em] font-semibold ${
          row.offense_status === 1 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
        }`}
      >
        {row.offense_status === 1 ? "Major" : "Minor"}
      </span>
    </div>
  );
  const offenseRows = rows
    .flatMap((r) => r.occurrences.map((o) => ({
      ...o,
      violation_name: r.violation_name,
      offense_status: r.offense_status,
      time: new Date(o.date ?? 0).getTime(),
    })))
    .sort((a, b) => b.time - a.time)
    .map((r, i) => ({ id: i + 1, ...r, offense: r.occurrence ? `${ordinal(r.occurrence)} offense` : "Offense" }));
  const offenseColumns = [
    columns[0],
    { field: "violation_name", headerName: "Violation", flex: 1.2, minWidth: 220, renderCell: violationCell },
    {
      field: "offense", headerName: "Offense", width: 120,
      sortComparator: (a, b, p1, p2) => (p1.api.getRow(p1.id).occurrence ?? 0) - (p2.api.getRow(p2.id).occurrence ?? 0),
      renderCell: ({ value }) => <span className="font-semibold text-gray-800">{value}</span>,
    },
    {
      field: "penalty", headerName: "Penalty", flex: 1.2, minWidth: 220,
      renderCell: ({ value }) => (
        <div className="py-3 whitespace-normal leading-snug">
          {value ? <span className="text-gray-900">{value}</span> : <span className="italic text-gray-400">No penalty set</span>}
        </div>
      ),
    },
    {
      field: "time", headerName: "Date", width: 190,
      renderCell: ({ row }) => (
        <span className="text-gray-700">{row.date ? `${readableDate(row.date)} • ${readableTime(row.date)}` : "No date"}</span>
      ),
    },
    {
      field: "action", headerName: "Action", width: 100, sortable: false, filterable: false, align: "right",
      renderCell: ({ row }) => (
        <ActionBtn
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!row.complaint_key}
          title="View the complaint behind this offense"
          onClick={() => openComplaint(row.complaint_key)}
        >
          View
        </ActionBtn>
      ),
    },
  ];

  return (
    <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-5">
      <ViewComplaintModal
        close={viewOpen}
        closeModal={setViewOpen}
        pd={["px-6 sm:px-10", "py-7"]}
        isEnableOuterClose={true}
        complainant={complaintKey}
        usr={user}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertTriangle className="text-gray-700" size="1.2em" />
          </div>
          <div className="font-semibold text-gray-800">Recent Violations</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {rows.length} violation{rows.length === 1 ? "" : "s"} · {offenseTotal} offense{offenseTotal === 1 ? "" : "s"}
          </div>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={grouped ? "grouped" : "ungrouped"}
            onChange={changeView}
            aria-label="Group the offenses by violation"
            sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, fontSize: "0.8rem", px: 1.5, py: 0.4 } }}
          >
            <ToggleButton value="grouped">Grouped</ToggleButton>
            <ToggleButton value="ungrouped">Ungrouped</ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>
      <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
        <DataGrid
          key={grouped ? "grouped" : "ungrouped"}
          rows={grouped ? rows : offenseRows}
          loading={violations == null}
          columns={grouped ? columns : offenseColumns}
          getRowHeight={() => "auto"}
          pagination
          pageSizeOptions={[5, 10, 20]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5, page: 0 },
            },
          }}
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          showToolbar
          localeText={{ noRowsLabel: "No recent violations found" }}
        />
      </Box>
    </div>
  );
};

// BehaviourAnalysis.jsx
// Assumes React + Tailwind + FontAwesome CDN are already included globally.
// Uses <i></i> for icons (no imports).

// The Python AI/ML API is a private Hugging Face Space now — the browser
// can't reach it directly without exposing its access key, so this goes
// through Laravel's own proxy instead (ViolationController::predictViolationRisk()).
// Verdict + insights first (quick), then the AI recommendations (slow).
const PREDICT_URL = "/api/student/violation/predict";
const RECOMMEND_URL = "/api/student/violation/recommend";

const BehaviourAnalysis = ({ studentId, violation_list, model_inputs, violation_timelines, onAppoint }) => {
  // -----------------------------
  // State
  // -----------------------------
  const [selected, setSelected] = useState("");
  const [violation, setViolation] = useState('')
  const [data, setData] = useState(null)


  useEffect(() => {
    if (!selected && violation_list.length) {
      // Preselect ?violation=<id> when it's one of this student's violations.
      const wanted = new URLSearchParams(window.location.search).get('violation')
      const pick = violation_list.find((v) => String(v.id) === wanted) ?? violation_list[0]
      setSelected(pick.id)
      setViolation(pick.violation_name)
    };
  }, [selected]);

  useEffect(() => {
    if (selected === '') return;

    setData(null)
    setViolation(violation_list.filter((e, _) => e.id == selected)[0].violation_name)

    const modelInput = model_inputs?.[selected]
    const timeline = violation_timelines?.[selected] ?? []

    // A violation can appear in this student's selectable list from a
    // still-pending/ongoing complaint even though the model input only
    // counts *resolved* occurrences — so there can legitimately be no
    // model input row for it yet.
    if (!modelInput) {
      setData({
        prediction: "Not Enough Data",
        binary: 0,
        insights: ["This student has no resolved complaints for this violation yet, so a prediction cannot be made."],
        recommendations: [],
        violation_timeline: timeline,
      })
      return
    }

    let cancelled = false;

    axios.post(PREDICT_URL, { model_input: modelInput })
      .then(({ data: json }) => {
        if (cancelled) return;
        if (!json || !("prediction" in json)) throw new Error("Malformed prediction response");

        // Show the verdict and insights now; recommendations: null means
        // they're still being written.
        setData({
          prediction: json.prediction == 1 ? "Likely to Commit Again" : "Unlikely to Commit Again",
          binary: json.prediction,
          insights: json.insights,
          recommendations: null,
          violation_timeline: timeline,
        })

        // The verdict and insights go along: Gemini writes the
        // recommendations from them (no second prediction).
        axios.post(RECOMMEND_URL, { model_input: modelInput, prediction: Number(json.prediction) === 1 ? 1 : 0, insights: json.insights ?? [] })
          .then(({ data: r }) => {
            if (cancelled) return;
            const ok = Array.isArray(r?.reco)
            setData((d) => d && { ...d, recommendations: ok ? r.reco : [], recoFailed: !ok })
          })
          .catch(() => {
            if (cancelled) return;
            setData((d) => d && { ...d, recommendations: [], recoFailed: true })
          })
      })
      .catch(() => {
        if (cancelled) return;
        setData({
          prediction: "Unavailable",
          binary: 0,
          insights: ["The prediction service is currently unavailable. Please try again later."],
          recommendations: [],
          violation_timeline: timeline,
        })
      });

    return () => { cancelled = true };
  }, [selected]);

  const riskUI = data?.binary
    ? {
        title: "Likely to Commit",
        border: "border-red-200",
        bg: "bg-red-50",
        titleColor: "text-red-600",
        dot: "bg-red-500",
        iconColor: "text-red-600",
        ring: "ring-red-200",
      }
    : {
        title: "Unlikely to Commit",
        border: "border-green-200",
        bg: "bg-green-50",
        titleColor: "text-green-600",
        dot: "bg-green-500",
        iconColor: "text-green-600",
        ring: "ring-green-200",
      };


  // The analysis on screen as a PDF, in a new tab (once the
  // recommendations are written).
  const reportReady = data != null && data.recommendations != null
  const generateReport = () => {
    if (!reportReady) return
    openPdfTabPost(`${window.location.pathname.replace(/\/$/, "")}/analysis-report`, {
      violation_id: selected,
      prediction: data.prediction,
      binary: data.binary == 1 ? 1 : 0,
      insights: data.insights ?? [],
      recommendations: data.recommendations ?? [],
    }, "behavioural analysis report")
  }

  return (
    <div className="grid gap-6">
      {/* Recidivism Prediction */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            size="small"
            displayEmpty
            sx={{
                minWidth: "190px", flex: 1,
                bgcolor: "var(--dm-surface, white)",
                '& .MuiOutlinedInput-root, &.MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.85em' },
            }}
        >
            {!violation_list.some((t) => t.id === selected) && (
                <MenuItem value={selected} sx={{ display: "none" }}></MenuItem>
            )}
            {violation_list.map((t, i) => (
                <MenuItem key={i} value={t.id}>
                    {t.violation_name}
                </MenuItem>
            ))}
        </Select>
        <MuiButton
            variant="contained"
            disableElevation
            onClick={generateReport}
            disabled={!reportReady}
            startIcon={<FileText size={16} />}
            title={reportReady ? "Open this analysis as a PDF in a new tab" : "Available once the recommendations are written"}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0, height: 40 }}
        >
            Generate Report
        </MuiButton>
      </div>
        {data == null
        ?
        <BehaviourAnalysisSkeleton />
        :
        <>
        <div className="grid gap-4">
          {/* Verdict header */}
          <div className={`border rounded-xl p-6 ${riskUI.bg} ${riskUI.border} flex flex-col sm:flex-row sm:items-center gap-4`}>
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className={`h-16 w-16 rounded-full bg-white flex items-center justify-center ring-4 ${riskUI.ring} flex-shrink-0`}>
                <ShieldHalf size={24} className={riskUI.iconColor} />
              </div>
              <div className="min-w-0">
                <div className={`text-xl font-extrabold ${riskUI.titleColor}`}>{data.prediction}</div>
                <div className="text-sm text-slate-600 mt-0.5">
                  Prediction for repeating{" "}
                  <span className="font-semibold">"{violation}"</span> based on behavioral analysis.
                </div>
              </div>
            </div>
            {onAppoint && data.binary == 1 && (
              <div className="shrink-0 self-end sm:self-auto">
                <Btn onclick={onAppoint} icon={<CalendarPlus size={19} />}>Set Appointment</Btn>
              </div>
            )}
          </div>

          {/* Factors + Recommendations */}
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <ContributingFactors insights={data.insights} tone={toneOf(data.binary == 1)} />
            <Recommendations list={data.recommendations} failed={data.recoFailed} tone={toneOf(data.binary == 1)} />
          </div>
        </div>
        {/* Violation Timeline */}
      <div className="rounded-md p-6 bg-white shadow-black/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="text-gray-700" />
            </div>
            <div className="font-semibold text-gray-800">Violation Timeline</div>
          </div>

          <div className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {data.violation_timeline.length} records
          </div>
        </div>

        <div className="mt-6">
          {data.violation_timeline.length === 0 ? (
            <div className="grid place-items-center text-gray-500 py-10">
              <FolderOpen size="2.5em" className="mb-2 opacity-60" />
              <p>No violation history found.</p>
            </div>
          ) : (
          <div className="relative pl-6">
            <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-200"></div>

            <div className="space-y-6">
              {data.violation_timeline.map((v) => {

                return (
                  <div key={v.id} className="relative">
                    <div className={`absolute -left-[1.2rem] top-1 h-3 w-3 rounded-full bg-gray-800`}></div>

                    <div className="space-y-1">
                      <div className="grid gap-3">
                        <div className="text-sm text-gray-500">
                          {readableDate(bestComplaintDate(v.complaint))} ({readableTime(bestComplaintDate(v.complaint))})
                        </div>
                        <div className="text-sm text-gray-500 font-bold">
                          From Case No. {v.complaint?.case_number}
                        </div>
                      </div>

                      {(v.complaint?.incident_summary || v.complaint?.complaintSubject?.[0]?.incident_summary) && (
                        <div className="text-sm text-gray-500">
                          {v.complaint?.incident_summary || v.complaint?.complaintSubject?.[0]?.incident_summary}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
          )}
        </div>
      </div>
        </>}
    </div>
  );
};



export default StudentViolation;

/* ===============================
   20 DEMO DATA
================================ */

export const demoProps = {
  user: { name: "Guidance Officer" },
  student: {
    id: "STU-001",
    full_name: "Juan Dela Cruz",
    grade_level: "Grade 11",
    section: "STEM-A",
  },
  violations: [
    { id: 1, violation_text: "Smoking", created_at: "2026-02-01", status: "open", reported_by: "Guard", notes: "Caught near gate" },
    { id: 2, violation_text: "Smoking", created_at: "2026-01-15", status: "resolved", reported_by: "Guard", notes: "Warning issued" },
    { id: 3, violation_text: "Cheating", created_at: "2026-01-10", status: "open", reported_by: "Teacher A", notes: "Copied answers" },
    { id: 4, violation_text: "Cheating", created_at: "2025-12-10", status: "resolved", reported_by: "Teacher B", notes: "First offense" },
    { id: 5, violation_text: "Stealing", created_at: "2025-11-05", status: "open", reported_by: "Student", notes: "Missing calculator" },
    { id: 6, violation_text: "Littering", created_at: "2025-10-01", status: "resolved", reported_by: "Staff", notes: "Trash in hallway" },
    { id: 7, violation_text: "Bullying", created_at: "2025-09-10", status: "open", reported_by: "Guidance", notes: "Cyber bullying" },
    { id: 8, violation_text: "Bullying", created_at: "2025-08-20", status: "resolved", reported_by: "Teacher", notes: "Warning given" },
    { id: 9, violation_text: "Vandalism", created_at: "2025-07-15", status: "resolved", reported_by: "Staff", notes: "Desk scratched" },
    { id: 10, violation_text: "Tardiness", created_at: "2025-06-01", status: "resolved", reported_by: "Teacher", notes: "Late 3 times" },
    { id: 11, violation_text: "Smoking", created_at: "2025-05-01", status: "resolved", reported_by: "Guard", notes: "Second offense" },
    { id: 12, violation_text: "Cheating", created_at: "2025-04-15", status: "resolved", reported_by: "Teacher", notes: "Plagiarism" },
    { id: 13, violation_text: "Stealing", created_at: "2025-03-12", status: "resolved", reported_by: "Student", notes: "Returned item" },
    { id: 14, violation_text: "Bullying", created_at: "2025-02-10", status: "resolved", reported_by: "Guidance", notes: "Counseling done" },
    { id: 15, violation_text: "Vandalism", created_at: "2025-01-05", status: "resolved", reported_by: "Staff", notes: "Graffiti" },
    { id: 16, violation_text: "Tardiness", created_at: "2024-12-01", status: "resolved", reported_by: "Teacher", notes: "Late again" },
    { id: 17, violation_text: "Smoking", created_at: "2024-11-01", status: "resolved", reported_by: "Guard", notes: "Confiscated lighter" },
    { id: 18, violation_text: "Bullying", created_at: "2024-10-01", status: "resolved", reported_by: "Teacher", notes: "Verbal abuse" },
    { id: 19, violation_text: "Cheating", created_at: "2024-09-01", status: "resolved", reported_by: "Teacher", notes: "Copied homework" },
    { id: 20, violation_text: "Stealing", created_at: "2024-08-01", status: "resolved", reported_by: "Student", notes: "Lost notebook" },
  ],
};
