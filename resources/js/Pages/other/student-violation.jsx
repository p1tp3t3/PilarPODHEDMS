import TabSwitcher from "@/Components/other/tab-switcher";
import PageLayout from "@/Layouts/page-layout";
import ProfilePic from "@/Components/other/profile-pic";
import BehaviourAnalysisSkeleton from "@/Components/reload/behaviour-analysis-skeleton";
import AuthLayout from "@/Layouts/auth-layout";
import { getProfilePic, getYearLevel, readableDate, readableTime } from "@/others/function";
import { Box, Select, MenuItem } from "@mui/material";
import { DataGrid } from "@/Components/other/data-grid";
import { useEffect, useMemo, useState } from "react";
import { ShieldHalf, Clock, FolderOpen, GraduationCap, CalendarRange, AlertTriangle } from "lucide-react";

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
  const [option, setOption] = useState('recent_violations')

  const optionList = [
    { key: 'recent_violations', label: 'Recent Violations' },
    { key: 'analysis', label: 'Behavioural Analysis' },
  ]

  return (
        <PageLayout title="STUDENT VIOLATION">
                <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                        <ProfilePic
                            src={getProfilePic(props.student.profile?.profile_picture, props.student.profile?.sex)}
                            size={5}
                        />
                        <div>
                            <div className="text-[1.15em] font-bold text-gray-800">
                                {props.student.profile?.first_name} {props.student.profile?.middle_name} {props.student.profile?.last_name}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
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
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2">
                    <TabSwitcher tabs={optionList} value={option} onChange={setOption} />
                    <div className="mt-6">
                        {option === "recent_violations" ? (
                            <RecentViolation violations={props.student_violations} />
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
  );
}

StudentViolation.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

/* ===============================
   RECENT VIOLATIONS TABLE
================================ */
const RecentViolation = ({ violations }) => {
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
    },
    {
      field: "offense_status",
      headerName: "Offense Type",
      width: 150,
      renderCell: ({ value }) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[0.8em] font-semibold ${
            value === 1 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
          }`}
        >
          {value === 1 ? "Major" : "Minor"}
        </span>
      ),
    },
    {
      field: "offense_issued_at",
      headerName: "Date Time Issued",
      width: 220,
      renderCell: ({ value }) => (
        <span>
          {readableDate(value)}
          {value && <span className="text-gray-500"> &bull; {readableTime(value)}</span>}
        </span>
      ),
    },
  ];

  const rows = violations.map((v, i) => ({
    id: i + 1,
    violation_name: v.violation?.violation_name,
    offense_status: v.violation?.offense_status,
    offense_issued_at: bestComplaintDate(v.complaint),
  }));

  return (
    <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertTriangle className="text-gray-700" size="1.2em" />
          </div>
          <div className="font-semibold text-gray-800">Recent Violations</div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
          {rows.length} record{rows.length === 1 ? "" : "s"}
        </div>
      </div>
      <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
        <DataGrid
          rows={rows}
          columns={columns}
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

// Same Flask host Laravel itself posts to server-side for this model
// (ViolationController previously proxied here) — called directly from the
// browser now instead, since the model-input rows for every violation this
// student has are already computed and handed down as page props.
const PYTHON_PREDICT_URL = "http://127.0.0.1:5032/python/model/predict";

const BehaviourAnalysis = ({ studentId, violation_list, model_inputs, violation_timelines }) => {
  // -----------------------------
  // State
  // -----------------------------
  const [selected, setSelected] = useState("");
  const [violation, setViolation] = useState('')
  const [data, setData] = useState(null)


  useEffect(() => {
    if (!selected && violation_list.length) {
      setSelected(violation_list[0].id)
      setViolation(violation_list[0].violation_name)
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

    fetch(PYTHON_PREDICT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelInput),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => {
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
