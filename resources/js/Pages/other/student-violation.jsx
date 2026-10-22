import TabSwitcher from "@/Components/other/tab-switcher";
import PageLayout from "@/Layouts/page-layout";
import ProfilePic from "@/Components/other/profile-pic";
import BehaviourAnalysisSkeleton from "@/Components/reload/behaviour-analysis-skeleton";
import AuthLayout from "@/Layouts/auth-layout";
import { getProfilePic, getYearLevel, readableDate, readableTime, toTitleCase, ordinal } from "@/others/function";
import { Box, Select, MenuItem } from "@mui/material";
import { DataGrid } from "@/Components/other/data-grid";
import { useEffect, useMemo, useState } from "react";
import { ShieldHalf, Clock, FolderOpen, GraduationCap, CalendarRange, AlertTriangle, CalendarPlus } from "lucide-react";
import axios from "axios";
import { Head } from "@inertiajs/react";
import ActionBtn from "@/Components/button/action-btn";
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal";
import AppointmentModal from "@/Components/modal/submission-form/set-appointment-modal";
import Btn from "@/Components/button/normal-btn";
import { useReload } from "@/context-provider/reload-provider";
import { DashboardService } from "@/others/services/dashboard-service";
import BreadcrumbNav from "@/Components/other/breadcrumb-nav";

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
  // The button only appears when the model says this student is likely to
  // repeat a violation; it stays hidden while that's checked, or if it can't be.
  const [risk, setRisk] = useState(null)
  useEffect(() => {
    if (!isPrefect || !props.student?.encrypted_id) return
    DashboardService.getStudentRisk(props.student.encrypted_id, setRisk, () => setRisk(null))
  }, [props.student?.encrypted_id])
  const canAppoint = isPrefect && risk?.likely === true

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
          rightSideComponent={canAppoint ? (
            <div className="flex items-center gap-3">
              <span
                className="text-[0.8em] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1 whitespace-nowrap"
                title={`Likely to repeat a violation (${Math.round((risk.top_probability ?? 0) * 100)}%)`}
              >
                <span className="hidden md:inline">Likely to repeat · </span>
                <span className="md:hidden">Risk </span>
                {Math.round((risk.top_probability ?? 0) * 100)}%
              </span>
              <Btn onclick={() => setAppointOpen(true)} icon={<CalendarPlus size={19} />}>Set Appointment</Btn>
            </div>
          ) : null}
        >
                <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-5">
                    {/* Phones: photo, name and details centred in a column;
                        wider screens: photo beside the details. */}
                    <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-5">
                        <ProfilePic
                            src={getProfilePic(props.student.profile?.profile_picture, props.student.profile?.sex)}
                            size={5}
                        />
                        <div>
                            <div className="text-[1.15em] font-bold text-gray-800">
                                {props.student.profile?.first_name} {props.student.profile?.middle_name} {props.student.profile?.last_name}
                            </div>
                            <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                                {props.student.program?.description && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.8em] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                        <GraduationCap size="1.1em" className="opacity-70" />
                                        {props.student.program?.description}
                                        {props.student.enrollments?.[props.student.enrollments.length - 1]?.year_level
                                            ? ` • ${getYearLevel(props.student.enrollments[props.student.enrollments.length - 1].year_level)}`
                                            : ""}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.8em] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                    <CalendarRange size="1.1em" className="opacity-70" />
                                    School Year {props.student.enrollments?.[props.student.enrollments.length - 1]?.school_year?.year || "N/A"}
                                    {props.student.enrollments?.[props.student.enrollments.length - 1]?.semester
                                        ? ` • ${ordinal(props.student.enrollments[props.student.enrollments.length - 1].semester)} Semester`
                                        : ""}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2">
                    <TabSwitcher tabs={optionList} value={option} onChange={setOption} />
                    <div className="mt-6">
                        {option === "recent_violations" ? (
                            <RecentViolation violations={props.student_violations} user={props.auth?.user ?? props.user} />
                        ) : (
                            <BehaviourAnalysis
                                studentId={props.student.id}
                                violation_list={props.violations}
                                model_inputs={props.model_inputs}
                                violation_timelines={props.violation_timelines}
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
    violations.reduce((acc, v) => {
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
  const offenseTotal = violations.length;

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertTriangle className="text-gray-700" size="1.2em" />
          </div>
          <div className="font-semibold text-gray-800">Recent Violations</div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
          {rows.length} violation{rows.length === 1 ? "" : "s"} · {offenseTotal} offense{offenseTotal === 1 ? "" : "s"}
        </div>
      </div>
      <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
        <DataGrid
          rows={rows}
          columns={columns}
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
          components={{
            NoRowsOverlay: () => (
              <div className="grid place-items-center h-full text-gray-500 py-10">
                <FolderOpen size="2.5em" className="mb-2 opacity-60" />
                <p>No recent violations found.</p>
              </div>
            ),
          }}
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
const PREDICT_URL = "/api/student/violation/predict";

const BehaviourAnalysis = ({ studentId, violation_list, model_inputs, violation_timelines }) => {
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

        setData({
          prediction: json.prediction == 1 ? "Likely to Commit Again" : "Unlikely to Commit Again",
          binary: json.prediction,
          insights: json.insights,
          recommendations: json.reco,
          violation_timeline: timeline,
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


  return (
    <div className="grid gap-6">
      {/* Recidivism Prediction */}
        <Select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            size="small"
            displayEmpty
            sx={{
                minWidth: "190px",
                bgcolor: "white",
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
        {data == null
        ?
        <BehaviourAnalysisSkeleton />
        :
        <>
        <div className="grid gap-4">
          {/* Verdict header */}
          <div className={`border rounded-xl p-6 ${riskUI.bg} ${riskUI.border} flex items-center gap-4`}>
            <div className={`h-16 w-16 rounded-full bg-white flex items-center justify-center ring-4 ${riskUI.ring} flex-shrink-0`}>
              <ShieldHalf size={24} className={riskUI.iconColor} />
            </div>
            <div>
              <div className={`text-xl font-extrabold ${riskUI.titleColor}`}>{data.prediction}</div>
              <div className="text-sm text-slate-600 mt-0.5">
                Prediction for repeating{" "}
                <span className="font-semibold">"{violation}"</span> based on behavioral analysis.
              </div>
            </div>
          </div>

          {/* Factors + Recommendations */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="text-xs font-bold tracking-wide text-slate-500 uppercase mb-3">
                Contributing Factors
              </div>
              <ul className="space-y-3">
                {data.insights.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${riskUI.dot}`}></span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="text-xs font-bold tracking-wide text-slate-500 uppercase mb-3">
                Recommendations
              </div>
              <ul className="space-y-3">
                {data.recommendations.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[0.7em] font-bold text-white ${riskUI.dot}`}>
                      {i + 1}
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
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
