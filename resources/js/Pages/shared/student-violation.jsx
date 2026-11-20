import TabSwitcher from "@/Components/other/tab-switcher";
import PageLayout from "@/Layouts/page-layout";
import BehaviourAnalysisSkeleton from "@/Components/reload/behaviour-analysis-skeleton";
import AuthLayout from "@/Layouts/auth-layout";
import { readableDate, readableTime, toTitleCase, ordinal, openPdfTabPost, showOutputModal } from "@/others/function";
import { Box, Chip, Paper, Select, Stack, Typography, MenuItem, ToggleButton, ToggleButtonGroup, IconButton, Tooltip } from "@mui/material";
import { DataGrid } from "@/Components/other/data-grid";
import { useEffect, useMemo, useState } from "react";
import useListData from "@/others/hooks/use-list-data";
import { AlertTriangle, CalendarPlus, FileText } from "lucide-react";
import axios from "axios";
import { Head, usePage } from "@inertiajs/react";
import ActionBtn from "@/Components/button/action-btn";
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal";
import AppointmentModal from "@/Components/modal/submission-form/set-appointment-modal";
import Btn from "@/Components/button/normal-btn";
import { useReload } from "@/context-provider/reload-provider";
import BreadcrumbNav from "@/Components/other/breadcrumb-nav";
import { ContributingFactors, Recommendations, ViolationTimeline, toneOf } from "@/Components/card/behaviour-analysis-parts";
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
  // The violation open in Behavioural Analysis, pre-selected as the one the
  // appointment addresses.
  const [appointViolation, setAppointViolation] = useState(null)
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
            // Opened by the verdict card's Intervene button.
            title="Intervene"
            subtitle={"Set an appointment with the student to talk about their violation(s)."}
            close={appointOpen}
            closeModal={setAppointOpen}
            pd={["px-5", "py-7"]}
            isEnableOuterClose={true}
            id={viewer.id}
            user_type={viewer.role}
            reload={loadRegister}
            lockedUser={{ ...props.student, role: props.student.role ?? 'student' }}
            defaultReason="<p>Consultation with the Prefect of Discipline regarding your recent violations, as an early intervention.</p>"
            defaultViolationIds={appointViolation ? [Number(appointViolation)] : []}
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
                                // Intervene (Set Appointment) sits in the verdict card,
                                // for the prefect, when it says "Likely".
                                onAppoint={isPrefect ? (violationId) => { setAppointViolation(violationId ?? null); setAppointOpen(true) } : null}
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
// --- Recent Violations: small cells shared by both views ------------------

// Major / Minor, as a small tinted chip.
const SeverityChip = ({ major }) => (
  <Chip
    size="small"
    label={major ? "Major" : "Minor"}
    sx={{
      height: 20, fontSize: "0.68rem", fontWeight: 700, flexShrink: 0,
      bgcolor: `var(--tone-${major ? "red" : "blue"}-bg)`, color: `var(--tone-${major ? "red" : "blue"}-fg)`,
    }}
  />
)

const ViolationCell = ({ name, major }) => (
  <Stack sx={{ py: 1.25, gap: 0.5, minWidth: 0, whiteSpace: "normal" }}>
    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.35 }}>{name}</Typography>
    <Box><SeverityChip major={major} /></Box>
  </Stack>
)

// "6.0 — Exclusion": the penalty's code, muted, then what it is.
const PenaltyText = ({ penalty, code }) => penalty
  ? (
    <Typography component="span" sx={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
      {code != null && <Box component="span" sx={{ color: "text.secondary", fontWeight: 600, mr: 0.75 }}>{code}</Box>}
      {penalty}
    </Typography>
  )
  : <Typography component="span" sx={{ fontSize: "0.85rem", fontStyle: "italic", color: "text.disabled" }}>No penalty set</Typography>

const OffenseChip = ({ label }) => (
  <Chip size="small" variant="outlined" label={label}
    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, borderColor: "divider", flexShrink: 0 }} />
)

const DateText = ({ date }) => date
  ? (
    <Stack sx={{ lineHeight: 1.3 }}>
      <Typography sx={{ fontSize: "0.85rem" }}>{readableDate(date)}</Typography>
      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{readableTime(date)}</Typography>
    </Stack>
  )
  : <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>No date</Typography>

// View the complaint behind an offense (the system's own action button).
const ViewComplaintButton = ({ complaintKey, onOpen }) => (
  <ActionBtn
    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
    disabled={!complaintKey}
    title={complaintKey ? "View the complaint behind this offense" : "No complaint on record"}
    onClick={() => onOpen(complaintKey)}
  >
    View
  </ActionBtn>
)

// The penalty's code ("6.0") and description apart, for PenaltyText.
const penaltyParts = (penalty) => penalty
  ? { code: penalty.ref_number ?? null, text: toTitleCase(penalty.description ?? "") || null }
  : { code: null, text: null }

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

  const indexColumn = {
    field: "index",
    headerName: "#",
    width: 56,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
        {params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}
      </Typography>
    ),
  };

  const columns = [
    indexColumn,
    {
      field: "violation_name",
      headerName: "Violation",
      flex: 1.1,
      minWidth: 220,
      renderCell: ({ row }) => <ViolationCell name={row.violation_name} major={row.offense_status === 1} />,
    },
    {
      field: "occurrence_count",
      headerName: "Times",
      width: 90,
      renderCell: ({ value }) => <OffenseChip label={`${value}×`} />,
    },
    {
      field: "occurrences",
      headerName: "Offenses",
      flex: 2,
      minWidth: 380,
      sortable: false,
      filterable: false,
      // Every time it happened: which offense, its penalty, when, and a
      // View for the complaint behind it. The latest is last.
      renderCell: ({ row }) => (
        <Stack component="ol" sx={{ m: 0, p: 0, py: 1.25, gap: 1, width: "100%", listStyle: "none" }}>
          {row.occurrences.map((o) => (
            <Stack component="li" key={o.key} direction="row" sx={{ alignItems: "center", gap: 1.25, minWidth: 0 }}>
              <OffenseChip label={o.occurrence ? `${ordinal(o.occurrence)} offense` : "Offense"} />
              <Box sx={{ flex: 1, minWidth: 0, whiteSpace: "normal" }}>
                <PenaltyText penalty={o.penalty} code={o.penalty_code} />
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                  {o.date ? `${readableDate(o.date)} · ${readableTime(o.date)}` : "No date"}
                </Typography>
              </Box>
              <ViewComplaintButton complaintKey={o.complaint_key} onOpen={openComplaint} />
            </Stack>
          ))}
        </Stack>
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
        .map((v, k) => {
          const p = penaltyParts(v.penalty)
          return {
            key: `${v.complaint_id}-${k}`,
            occurrence: v.occurrence,
            penalty: p.text,
            penalty_code: p.code,
            date: bestComplaintDate(v.complaint),
            complaint_key: v.complaint_key,
          }
        })
        .sort((a, b) => (a.occurrence ?? 0) - (b.occurrence ?? 0) || new Date(a.date ?? 0) - new Date(b.date ?? 0));
      return {
        violation_name: violation?.violation_name,
        offense_status: violation?.offense_status,
        occurrence_count: occurrences.length,
        last_date: occurrences.reduce((m, o) => Math.max(m, new Date(o.date ?? 0).getTime()), 0),
        occurrences,
      };
    })
    .sort((a, b) => b.last_date - a.last_date)
    .map((r, i) => ({ id: i + 1, ...r }));
  const offenseTotal = (violations ?? []).length;

  // Ungrouped: every offense on its own row, newest first.
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
    indexColumn,
    {
      field: "violation_name", headerName: "Violation", flex: 1.3, minWidth: 220,
      renderCell: ({ row }) => <ViolationCell name={row.violation_name} major={row.offense_status === 1} />,
    },
    {
      field: "offense", headerName: "Offense", width: 120,
      sortComparator: (a, b, p1, p2) => (p1.api.getRow(p1.id).occurrence ?? 0) - (p2.api.getRow(p2.id).occurrence ?? 0),
      renderCell: ({ value }) => <OffenseChip label={value} />,
    },
    {
      field: "penalty", headerName: "Penalty", flex: 1, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1.25, whiteSpace: "normal" }}><PenaltyText penalty={row.penalty} code={row.penalty_code} /></Box>
      ),
    },
    {
      field: "time", headerName: "Date", width: 140,
      renderCell: ({ row }) => <DateText date={row.date} />,
    },
    {
      field: "action", headerName: "Action", width: 96, sortable: false, filterable: false, disableColumnMenu: true,
      align: "center", headerAlign: "center",
      renderCell: ({ row }) => <ViewComplaintButton complaintKey={row.complaint_key} onOpen={openComplaint} />,
    },
  ];

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", minWidth: 0 }}>
      <ViewComplaintModal
        close={viewOpen}
        closeModal={setViewOpen}
        pd={["px-6 sm:px-10", "py-7"]}
        isEnableOuterClose={true}
        complainant={complaintKey}
        usr={user}
      />
      {/* Header: title, the counts and the Grouped / Ungrouped switch. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", gap: 1.5, px: { xs: 2, sm: 2.5 }, py: 1.75, borderBottom: 1, borderColor: "divider" }}
      >
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "var(--tone-red-bg)", color: "var(--tone-red-fg)", flexShrink: 0 }}>
            <AlertTriangle size={17} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: "1rem", lineHeight: 1.3 }}>Recent Violations</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {rows.length} violation{rows.length === 1 ? "" : "s"} · {offenseTotal} offense{offenseTotal === 1 ? "" : "s"}
            </Typography>
          </Box>
        </Stack>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={grouped ? "grouped" : "ungrouped"}
          onChange={changeView}
          aria-label="Group the offenses by violation"
          sx={{ alignSelf: { xs: "flex-start", sm: "auto" }, "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, fontSize: "0.8rem", px: 1.5, py: 0.4 } }}
        >
          <ToggleButton value="grouped">Grouped</ToggleButton>
          <ToggleButton value="ungrouped">Ungrouped</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
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
          // Sits inside the card: no frame of its own, a light header row.
          sx={{
            border: 0,
            borderRadius: 0,
            "& .MuiDataGrid-toolbar": { minHeight: 44, px: 1, borderBottom: 1, borderColor: "divider" },
            "& .MuiDataGrid-columnHeader": { bgcolor: "action.hover" },
            "& .MuiDataGrid-columnHeaderTitle": { fontSize: "0.78rem", fontWeight: 600, color: "text.secondary" },
            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
          }}
        />
      </Box>
    </Paper>
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
  const [refreshing, setRefreshing] = useState(false)
  // Only the prefect asks for a new set (it replaces the one everyone sees).
  const canRefresh = usePage().props.auth?.user?.role === "sub_admin"


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

  // "New set": Gemini writes different recommendations (the server keeps
  // them, so the report matches). If it fails, the current set stays.
  const refreshRecommendations = () => {
    const modelInput = model_inputs?.[selected]
    if (!modelInput || !data || refreshing) return
    const previous = data.recommendations
    setRefreshing(true)
    setData((d) => d && { ...d, recommendations: null, recoFailed: false })
    axios.post(RECOMMEND_URL, { model_input: modelInput, prediction: data.binary == 1 ? 1 : 0, insights: data.insights ?? [], refresh: true })
      .then(({ data: r }) => {
        if (Array.isArray(r?.reco) && r.reco.length) {
          setData((d) => d && { ...d, recommendations: r.reco, recoFailed: false })
        } else {
          throw new Error("empty")
        }
      })
      .catch((e) => {
        setData((d) => d && { ...d, recommendations: previous })
        showOutputModal(e?.response?.data?.message ?? "Couldn't write a new set right now. Please try again later.", "e")
      })
      .finally(() => setRefreshing(false))
  }

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
    <div className="grid gap-4">
      {/* Toolbar: which violation, and the report. */}
      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
        <Typography component="label" htmlFor="analysis-violation" sx={{ display: { xs: "none", sm: "block" }, fontSize: "0.8rem", fontWeight: 600, color: "text.secondary", flexShrink: 0 }}>
            Violation
        </Typography>
        <Select
            id="analysis-violation"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            size="small"
            displayEmpty
            sx={{
                flex: 1, minWidth: 0, maxWidth: { md: 560 }, height: 40,
                bgcolor: "background.paper", borderRadius: "8px", fontSize: "0.875rem",
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
        {/* Right beside the dropdown, the same height; icon only, the tooltip names it
            (a span so the tooltip also shows while it's disabled). */}
        <Tooltip title={reportReady ? "Generate Report" : "Available once the recommendations are written"}>
            <span style={{ flexShrink: 0, display: "flex" }}>
                <IconButton
                    aria-label="Generate Report"
                    color="primary"
                    onClick={generateReport}
                    disabled={!reportReady}
                    sx={{ width: 40, height: 40, border: 1, borderColor: "divider", borderRadius: "8px", bgcolor: "background.paper", "&:hover": { bgcolor: "action.hover" } }}
                >
                    <FileText size={18} />
                </IconButton>
            </span>
        </Tooltip>
      </Stack>

      {data == null
        ? <BehaviourAnalysisSkeleton />
        : (() => {
          // The "Main reason" goes in the verdict banner; the rest are the
          // Contributing Factors.
          const insights = data.insights ?? []
          const mainReason = insights.find((f) => /^main reason\s*:/i.test(f))
          const factors = insights.filter((f) => f !== mainReason)
          const tone = toneOf(data.binary == 1)
          const input = model_inputs?.[selected] ?? {}
          const lastRecord = (data.violation_timeline ?? [])
            .map((v) => bestComplaintDate(v.complaint))
            .filter(Boolean)
            .sort((x, y) => new Date(y) - new Date(x))[0]
          return (
            // Top: the verdict, its main reason and the key facts, full
            // width. Then the factors and the recommendations side by side,
            // and the timeline across the bottom. Phones: one column.
            <Stack sx={{ gap: 2 }}>
              <VerdictCard
                prediction={data.prediction}
                likely={data.binary == 1}
                violation={violation}
                mainReason={mainReason?.replace(/^main reason\s*:\s*/i, "")}
                facts={[
                  { label: "Times committed", value: input.past_repeat_same_violation_count ?? "—" },
                  { label: "Last offense", value: lastRecord ? readableDate(lastRecord) : "—" },
                  { label: "Other violations", value: input.other_violations_count ?? "—", hint: input.other_violations_recent_count ? `${input.other_violations_recent_count} in the last 90 days` : null },
                  { label: "Interventions since", value: input.interventions_since_last ?? "—" },
                ]}
                onAppoint={onAppoint && data.binary == 1 ? () => onAppoint(selected) : null}
              />
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, alignItems: "start" }}>
                <ContributingFactors insights={factors} tone={tone} />
                <Recommendations
                  list={data.recommendations}
                  failed={data.recoFailed}
                  tone={tone}
                  onRefresh={canRefresh && model_inputs?.[selected] ? refreshRecommendations : null}
                  refreshing={refreshing}
                />
              </Box>
              <ViolationTimeline records={data.violation_timeline} dateOf={(v) => bestComplaintDate(v.complaint)} />
            </Stack>
          )
        })()}
    </div>
  );
};

// The verdict banner: the result in its tone and what it is about, the
// main reason for it, (for the prefect, when "Likely") Intervene (sets an
// appointment), and
// a strip of the key facts from the record.
const VerdictCard = ({ prediction, likely, violation, mainReason, facts = [], onAppoint }) => {
  const tone = likely ? "red" : "green"
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 2, p: { xs: 2, sm: 2.5 }, alignItems: { md: "center" } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, bgcolor: `var(--tone-${tone}-fg)` }} />
            <Typography sx={{ fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.3, color: `var(--tone-${tone}-fg)` }}>{prediction}</Typography>
          </Stack>
          <Typography sx={{ mt: 0.5, fontSize: "0.82rem", lineHeight: 1.55, color: "text.secondary" }}>
            Prediction for repeating "{violation}", based on the student's discipline record.
          </Typography>
          {mainReason && (
            <Typography sx={{ mt: 1, fontSize: "0.875rem", lineHeight: 1.6 }}>
              <Box component="span" sx={{ fontWeight: 700, color: `var(--tone-${tone}-fg)` }}>Main reason: </Box>
              {mainReason}
            </Typography>
          )}
        </Box>
        {onAppoint && (
          <Box sx={{ flexShrink: 0 }}>
            <Btn onclick={onAppoint} icon={<CalendarPlus size={19} />}>Intervene</Btn>
          </Box>
        )}
      </Stack>
      {facts.length > 0 && (
        <Box sx={{
          display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${facts.length}, minmax(0, 1fr))` },
          borderTop: 1, borderColor: "divider", bgcolor: "action.hover",
        }}>
          {facts.map((f, i) => (
            <Box key={f.label} sx={{
              px: { xs: 2, sm: 2.5 }, py: 1.25, minWidth: 0,
              borderStyle: "solid", borderColor: "divider", borderWidth: 0,
              borderLeftWidth: { xs: i % 2 ? 1 : 0, md: i ? 1 : 0 },
              borderTopWidth: { xs: i > 1 ? 1 : 0, md: 0 },
            }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary" }}>{f.label}</Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1.4 }}>{f.value}</Typography>
              {f.hint && <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{f.hint}</Typography>}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

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
