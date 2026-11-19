import { useMemo, useRef } from "react"
import { Printer, ChevronDown, BookOpen } from "lucide-react"
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material"
import { readableDate, readableTime } from "@/others/function"
import { Bar, Line } from "react-chartjs-2"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Filler,
    Title,
    Tooltip,
    Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend)

// Evaluation of the Early Intervention Violation Predictor's last training:
// k-fold cross-validation per fold, mean ± std, held-out confusion matrix
// and ROC curve.

// `color`: the chart bars (canvas); `tone`: the label text (light/dark CSS variable).
const METRICS = [
    { key: "accuracy", tone: "blue", label: "Accuracy", color: "#2563eb" },
    { key: "roc_auc", tone: "green", label: "ROC AUC", color: "#16a34a" },
    { key: "precision", tone: "amber", label: "Precision", color: "#d97706" },
    { key: "recall", tone: "red", label: "Recall", color: "#dc2626" },
    { key: "f1", tone: "purple", label: "F1", color: "#7c3aed" },
]

const pct = (v) => `${(v * 100).toFixed(1)}%`

// --- Status of the cross-validation ----------------------------------------
// A metric's level from its mean (ROC AUC is held to the usual AUC scale;
// the rest to plain percentages), and its stability from the spread across
// folds (std). The overall status needs a good AUC and steady folds.
const LEVELS = {
    roc_auc: [[0.9, "Excellent"], [0.8, "Good"], [0.7, "Fair"]],
    default: [[0.85, "Excellent"], [0.7, "Good"], [0.6, "Fair"]],
}
const LEVEL_TONE = { Excellent: "green", Good: "blue", Fair: "amber", Poor: "red" }
const levelOf = (key, mean) => ((LEVELS[key] ?? LEVELS.default).find(([min]) => mean >= min)?.[1]) ?? "Poor"
const stabilityOf = (std) => (std <= 0.05 ? "Stable" : std <= 0.08 ? "Varies" : "Unstable")

export const overallStatus = (cv) => {
    const auc = cv.mean.roc_auc ?? 0
    const worstStd = Math.max(...METRICS.map((m) => cv.std[m.key] ?? 0))
    if (auc >= 0.8 && worstStd <= 0.05) {
        return { label: "Passed", tone: "green", text: `Strong ranking (mean ROC AUC ${pct(auc)}) and consistent results across all ${cv.k} folds (largest spread ${pct(worstStd)}).` }
    }
    if (auc >= 0.7 && worstStd <= 0.08) {
        return { label: "Acceptable", tone: "amber", text: `Usable ranking (mean ROC AUC ${pct(auc)}), with results that vary somewhat between folds (largest spread ${pct(worstStd)}).` }
    }
    return { label: "Needs improvement", tone: "red", text: `Weak ranking (mean ROC AUC ${pct(auc)}) or results that change too much between folds (largest spread ${pct(worstStd)}).` }
}

// A small tinted label (light/dark tones from app.css).
export const Pill = ({ tone, children }) => (
    <Box
        component="span"
        sx={{
            display: "inline-flex", alignItems: "center", px: 1, py: 0.25, borderRadius: 99,
            fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap", border: 1,
            bgcolor: `var(--tone-${tone}-bg)`, color: `var(--tone-${tone}-fg)`, borderColor: `var(--tone-${tone}-bd)`,
        }}
    >
        {children}
    </Box>
)

const StatusBanner = ({ cv, real }) => {
    const st = overallStatus(cv)
    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
                gap: { xs: 0.5, sm: 1.5 }, alignItems: { sm: "baseline" }, px: 1.5, py: 1.25, borderRadius: 1.5, border: 1,
                bgcolor: `var(--tone-${st.tone}-bg)`, borderColor: `var(--tone-${st.tone}-bd)`,
            }}
        >
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap", color: `var(--tone-${st.tone}-fg)` }}>
                Status: {st.label}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                {st.text}
                {real && !real.enough && " Measured on the synthetic dataset; not yet confirmed on real students."}
            </Typography>
        </Stack>
    )
}

// One card of the page: title, a hint under it, an action on the right.
export const Panel = ({ title, hint, action, icon: Icon, children, sx }) => (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, display: "grid", gap: 2, minWidth: 0, ...sx }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Stack direction="row" sx={{ gap: 1.5, alignItems: "flex-start", minWidth: 0 }}>
                {Icon && (
                    <Box sx={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", bgcolor: "var(--tone-blue-bg)", color: "var(--tone-blue-fg)" }}>
                        <Icon size={18} />
                    </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>{title}</Typography>
                    {hint && <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{hint}</Typography>}
                </Box>
            </Stack>
            {action}
        </Stack>
        {children}
    </Paper>
)

// Compact table cells used by every table on the page.
const HEAD = { fontSize: "0.75rem", fontWeight: 500, color: "text.secondary", py: 1, px: 1, whiteSpace: "nowrap" }
const CELL = { fontSize: "0.8rem", py: 1, px: 1 }

// --- Plain-language explanations of each chart ---------------------------
// Written for the Prefect and staff, not data specialists: what the chart
// shows, what each part means in school terms, how to tell good from bad,
// and what the current numbers say. Shown under each chart and printed in
// the report. Each returns { intro, points: [{ label, text }], reading }.

const EXPLAIN = {
    cv: (cv) => {
        const worst = METRICS.map((m) => [m.label, cv.std[m.key] ?? 0]).sort((a, b) => b[1] - a[1])[0]
        return {
            intro: `Cross-validation tests the model ${cv.k} separate times instead of once. All the training cases are split into ${cv.k} equal groups, called folds. In each test the model learns from ${cv.k - 1} of the groups and is then checked on the one group it has never seen, so every case is used for testing exactly once. Each cluster of bars in the chart is one of these ${cv.k} tests, and each coloured bar is one way of scoring it.`,
            points: [
                { label: "Accuracy (blue)", text: `Out of all the students tested, the share the model judged correctly, whether it said "will repeat" or "will not repeat". Average: ${pct(cv.mean.accuracy)}. On its own it can mislead: if most students never repeat, always answering "will not repeat" already scores well.` },
                { label: "ROC AUC (green)", text: `How well the model ranks students by risk. Take one student who repeated and one who did not: this is how often the model gives the higher risk to the right one. 50% is no better than guessing and 100% is perfect. Average: ${pct(cv.mean.roc_auc)}.` },
                { label: "Precision (orange)", text: `Of the students the model flagged as likely to repeat, the share who really did. Low precision means many false alarms: students flagged who would not have repeated. Average: ${pct(cv.mean.precision)}.` },
                { label: "Recall (red)", text: `Of the students who really repeated, the share the model caught. Low recall means repeaters are being missed, which matters most for early intervention. Average: ${pct(cv.mean.recall)}.` },
                { label: "F1 (purple)", text: `One score that balances precision and recall; it is only high when both are high. Average: ${pct(cv.mean.f1)}.` },
            ],
            reading: `Taller bars are better, but what matters most is that each colour stays about the same height in all ${cv.k} tests. Bars that jump up and down would mean the result depends on which students happened to be in the test group, so it could not be trusted. Here the score that changes most is ${worst[0].toLowerCase()}, by about ±${pct(worst[1])} between tests, which is ${worst[1] <= 0.05 ? "small: the results are consistent" : worst[1] <= 0.08 ? "moderate: the results vary somewhat" : "large: the results are not consistent"}. The table below the chart lists the exact numbers, their average (mean) and how much they vary (± std), with a rating for each.`,
        }
    },
    confusion: (matrix, testSize) => {
        const [[tn, fp], [fn, tp]] = matrix
        const total = tn + fp + fn + tp || 1
        return {
            intro: `The confusion matrix compares the model's answers with what really happened, for the ${testSize} cases that were set aside before training (the model never saw them while learning, so this is a fair test). Each row is what really happened to the student; each column is what the model predicted. Every one of the ${testSize} cases lands in exactly one of the four boxes.`,
            points: [
                { label: "True negative (top left)", text: `${tn} students did not repeat the violation, and the model correctly said they would not.` },
                { label: "True positive (bottom right)", text: `${tp} students did repeat, and the model correctly flagged them as likely to repeat. These are the students early intervention is meant for.` },
                { label: "False positive (top right)", text: `${fp} students did not repeat, but the model flagged them anyway: a false alarm. In practice, these students would get a check-in or counselling they did not strictly need, which costs some time but does little harm.` },
                { label: "False negative (bottom left)", text: `${fn} students did repeat, but the model said they would not: a missed case. In practice, a student who needed early intervention could be overlooked, so this is the more serious kind of mistake.` },
            ],
            reading: `The green boxes (top left and bottom right) are correct answers and the red boxes are mistakes; the deeper the colour, the more students are in the box. A good model puts most students in the two green boxes. Here ${tn + tp} of ${total} cases (${pct((tn + tp) / total)}) are correct, with ${fp} false alarms and ${fn} missed repeaters${fn > fp ? ". The model misses more repeaters than it falsely flags, so it leans toward caution in flagging." : "."}`,
        }
    },
    roc: (auc, threshold = 0.5) => ({
        intro: `The model gives every student a risk percentage, and a student is flagged as "likely to repeat" when that risk is above a cut-off (currently ${pct(threshold)}${threshold < 0.5 ? ", set low on purpose so that as few repeaters as possible are missed" : ""}). Moving the cut-off changes the result: a lower cut-off flags more students, catching more repeaters but also raising more false alarms. The ROC curve shows this trade-off for every possible cut-off at once, using the same held-out test cases as the confusion matrix.`,
        points: [
            { label: "Across (false positive rate)", text: `The share of students who did NOT repeat but were flagged anyway: the false-alarm rate. Further right means more false alarms.` },
            { label: "Up (true positive rate)", text: `The share of students who DID repeat and were caught: the catch rate. Higher means more repeaters caught.` },
            { label: "Blue curve (the model)", text: `Each point on it is one possible cut-off. Starting at the bottom left (flag no one) and ending at the top right (flag everyone), the curve shows how many repeaters can be caught for a given rate of false alarms.` },
            { label: "Dashed line (random guess)", text: `What flagging students at random would give: every extra repeater caught costs an equal share of false alarms. A useful model must stay well above this line.` },
            { label: "AUC (area under the curve)", text: `The space under the blue curve, from 0.5 (no better than guessing) to 1.0 (perfect). As a rule of thumb, 0.7 is acceptable, 0.8 is good and 0.9 is excellent. Here it is ${auc.toFixed(3)}.` },
        ],
        reading: `A good curve rises steeply at first and stays close to the top-left corner: it catches most repeaters before raising many false alarms. With an AUC of ${auc.toFixed(3)}, ${auc >= 0.9 ? "the model separates students who repeat from those who do not very well" : auc >= 0.8 ? "the model separates students who repeat from those who do not well" : auc >= 0.7 ? "the model separates the two groups reasonably, with room for improvement" : "the model separates the two groups poorly and should not be relied on"}: given one student who repeated and one who did not, it gives the higher risk to the right one ${pct(auc)} of the time.`,
    }),
    calibration: (cal) => {
        const rows = cal.bins.filter((b) => b.count >= 20)
        const over = rows.filter((b) => b.predicted - b.observed > 0.05).length
        const under = rows.filter((b) => b.observed - b.predicted > 0.05).length
        return {
            intro: `When the model says a student has a 70% risk, about 70 out of every 100 such students should really go on to repeat. Calibration checks whether the model's percentages can be taken at face value. Every case is given a risk by a model that did not learn from it, the cases are grouped into risk bands (0–10%, 10–20%, and so on), and for each band the table compares what the model predicted with what actually happened.`,
            points: [
                { label: "Avg. predicted (blue bar)", text: `The average risk the model gave the students in that band.` },
                { label: "Actually repeated (green bar)", text: `The share of those students who really repeated the violation.` },
                { label: "Rows", text: `How many cases fall in that band. A band with only a few cases is less reliable, so its gap matters less.` },
                { label: "Brier score", text: `One number for the overall accuracy of the percentages: the average squared difference between each predicted risk and what happened. 0 is perfect, lower is better, and 0.25 is what always answering "50%" would score. Here it is ${cal.brier.toFixed(3)}.` },
                ...(cal.max_gap != null ? [{ label: "Largest gap", text: `The biggest difference between the blue and green values in any band with at least 20 cases. Here it is ${pct(cal.max_gap)}.` }] : []),
            ],
            reading: `If the blue and green bars are about the same length in every row, the model's percentages can be read as real chances. A green bar clearly shorter than the blue one means the model overstates the risk in that band; a longer one means it understates it. ${over + under === 0 ? "Here every well-filled band is within 5 points, so the percentages are trustworthy." : `Here ${over ? `${over} band${over > 1 ? "s" : ""} overstate${over > 1 ? "" : "s"}` : ""}${over && under ? " and " : ""}${under ? `${under} band${under > 1 ? "s" : ""} understate${under > 1 ? "" : "s"}` : ""} the risk by more than 5 points, so read those percentages with some care.`}`,
        }
    },
}

// The explanation under a chart: collapsible, open by default.
const Explain = ({ content }) => (
    <Accordion
        disableGutters
        defaultExpanded
        elevation={0}
        sx={{ border: 1, borderColor: "divider", borderRadius: "8px !important", bgcolor: "action.hover", "&:before": { display: "none" } }}
    >
        <AccordionSummary expandIcon={<ChevronDown size={16} />} sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 1, alignItems: "center", gap: 1 } }}>
            <BookOpen size={15} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>How to read this chart</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, display: "grid", gap: 1.25 }}>
            <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.7, textAlign: "justify" }}>{content.intro}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.25, display: "grid", gap: 0.75 }}>
                {content.points.map((p) => (
                    <Typography component="li" key={p.label} sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.7, textAlign: "justify" }}>
                        <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{p.label}: </Box>{p.text}
                    </Typography>
                ))}
            </Box>
            <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.7, textAlign: "justify" }}>
                <Box component="span" sx={{ fontWeight: 600 }}>What it shows now: </Box>
                <Box component="span" sx={{ color: "text.secondary" }}>{content.reading}</Box>
            </Typography>
        </AccordionDetails>
    </Accordion>
)

// The page re-renders every second (live clocks elsewhere), so chart data
// and options are memoized and animation is off — otherwise each render
// restarts the draw animation and the charts never finish drawing.
const BAR_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
        legend: { position: "top", labels: { boxWidth: 12 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y}%` } },
    },
    scales: { y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
}

const CrossValidationChart = ({ cv }) => {
    const data = useMemo(() => ({
        labels: cv.folds.map((f) => `Fold ${f.fold}`),
        datasets: METRICS.map((m) => ({
            label: m.label,
            data: cv.folds.map((f) => +(f[m.key] * 100).toFixed(1)),
            backgroundColor: m.color,
            borderRadius: 3,
        })),
    }), [cv])
    return (
        <Box sx={{ height: "18rem" }}>
            <Bar data={data} options={BAR_OPTIONS} />
        </Box>
    )
}

const SummaryTable = ({ cv }) => (
    <TableContainer>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell sx={{ ...HEAD, pl: 0 }}>Metric</TableCell>
                    {cv.folds.map((f) => <TableCell key={f.fold} sx={HEAD}>Fold {f.fold}</TableCell>)}
                    <TableCell sx={HEAD}>Mean ± Std</TableCell>
                    <TableCell sx={{ ...HEAD, pr: 0 }}>Status</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {METRICS.map((m) => {
                    const level = levelOf(m.key, cv.mean[m.key])
                    const stability = stabilityOf(cv.std[m.key])
                    return (
                        <TableRow key={m.key}>
                            <TableCell sx={{ ...CELL, pl: 0, fontWeight: 600, color: `var(--tone-${m.tone}-fg)` }}>{m.label}</TableCell>
                            {cv.folds.map((f) => <TableCell key={f.fold} sx={CELL}>{pct(f[m.key])}</TableCell>)}
                            <TableCell sx={{ ...CELL, fontWeight: 600, whiteSpace: "nowrap" }}>{pct(cv.mean[m.key])} ± {pct(cv.std[m.key])}</TableCell>
                            <TableCell sx={{ ...CELL, pr: 0 }}>
                                <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap" }}>
                                    <Pill tone={LEVEL_TONE[level]}>{level}</Pill>
                                    <Pill tone={stability === "Stable" ? "gray" : stability === "Varies" ? "amber" : "red"}>{stability}</Pill>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    </TableContainer>
)

// Calibration: for each band of predicted risk, the average prediction vs
// the share of students who actually repeated. Close bars = trustworthy %.
const Bar2 = ({ value, color }) => <Box sx={{ height: 6, borderRadius: 1, bgcolor: color, width: `${value * 100}%` }} />

const CalibrationTable = ({ calibration }) => (
    <Box sx={{ display: "grid", gap: 1 }}>
        <Stack direction="row" sx={{ gap: 2.5, flexWrap: "wrap", fontSize: "0.8rem" }}>
            <span><Box component="span" sx={{ color: "text.secondary" }}>Brier score:</Box> <b>{calibration.brier.toFixed(3)}</b> <Box component="span" sx={{ color: "text.disabled" }}>(lower is better)</Box></span>
            {calibration.max_gap != null && (
                <span><Box component="span" sx={{ color: "text.secondary" }}>Largest gap:</Box> <b>{pct(calibration.max_gap)}</b></span>
            )}
        </Stack>
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ ...HEAD, pl: 0 }}>Predicted risk</TableCell>
                        <TableCell sx={HEAD}>Avg. predicted</TableCell>
                        <TableCell sx={HEAD}>Actually repeated</TableCell>
                        <TableCell sx={{ ...HEAD, width: "40%" }}>Comparison</TableCell>
                        <TableCell sx={{ ...HEAD, pr: 0 }} align="right">Rows</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {calibration.bins.map((b) => (
                        <TableRow key={b.bin}>
                            <TableCell sx={{ ...CELL, pl: 0, whiteSpace: "nowrap" }}>{b.bin.split("-").map((v) => `${Math.round(v * 100)}%`).join(" – ")}</TableCell>
                            <TableCell sx={CELL}>{pct(b.predicted)}</TableCell>
                            <TableCell sx={CELL}>{pct(b.observed)}</TableCell>
                            <TableCell sx={CELL}>
                                <Box sx={{ display: "grid", gap: 0.25 }}>
                                    <Bar2 value={b.predicted} color="#2563eb" />
                                    <Bar2 value={b.observed} color="#16a34a" />
                                </Box>
                            </TableCell>
                            <TableCell sx={{ ...CELL, pr: 0, color: "text.secondary" }} align="right">{b.count}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        <Stack direction="row" sx={{ gap: 2, fontSize: "0.72rem", color: "text.secondary" }}>
            <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}><Box sx={{ width: 12, height: 6, borderRadius: 1, bgcolor: "#2563eb" }} /> Predicted</Stack>
            <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}><Box sx={{ width: 12, height: 6, borderRadius: 1, bgcolor: "#16a34a" }} /> Actually repeated</Stack>
        </Stack>
    </Box>
)

const ConfusionMatrix = ({ matrix }) => {
    const [[tn, fp], [fn, tp]] = matrix
    const max = Math.max(tn, fp, fn, tp) || 1
    const Cell = ({ value, label, good }) => (
        <Box
            sx={{
                borderRadius: 1.5, p: 1.5, textAlign: "center",
                bgcolor: good ? `rgba(22,163,74,${0.12 + 0.5 * value / max})` : `rgba(220,38,38,${0.08 + 0.4 * value / max})`,
            }}
        >
            <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{label}</Typography>
        </Box>
    )
    const Side = ({ children, align = "center" }) => (
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", textAlign: align, pr: align === "right" ? 0.5 : 0 }}>{children}</Typography>
    )
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 1, alignItems: "center" }}>
            <div />
            <Side>Predicted: won't repeat</Side>
            <Side>Predicted: will repeat</Side>
            <Side align="right">Actual: won't repeat</Side>
            <Cell value={tn} label="True negative" good />
            <Cell value={fp} label="False positive" />
            <Side align="right">Actual: will repeat</Side>
            <Cell value={fn} label="False negative" />
            <Cell value={tp} label="True positive" good />
        </Box>
    )
}

const ROC_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: { legend: { position: "top", labels: { boxWidth: 12 } } },
    scales: {
        x: { type: "linear", min: 0, max: 1, title: { display: true, text: "False positive rate" } },
        y: { type: "linear", min: 0, max: 1, title: { display: true, text: "True positive rate" } },
    },
}

const RocCurve = ({ curve, auc }) => {
    const data = useMemo(() => ({
                datasets: [
                    {
                        label: `Model (AUC ${auc.toFixed(3)})`,
                        data: curve.fpr.map((x, i) => ({ x, y: curve.tpr[i] })),
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37,99,235,0.12)",
                        fill: true,
                        pointRadius: 0,
                        tension: 0,
                    },
                    {
                        label: "Random guess",
                        data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                        borderColor: "#9ca3af",
                        borderDash: [5, 5],
                        pointRadius: 0,
                    },
                ],
    }), [curve, auc])
    return (
        <Box sx={{ height: "16rem" }}>
            <Line data={data} options={ROC_OPTIONS} />
        </Box>
    )
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))

// Printable report: built from the data (not the on-screen Tailwind layout),
// with the two charts copied in as images, then the browser print dialog.
const printReport = (root, evaluation, model, insights = []) => {
    const [barImg, rocImg] = [...root.querySelectorAll("canvas")].map((c) => c.toDataURL("image/png"))
    const { cv } = evaluation
    const [[tn, fp], [fn, tp]] = evaluation.confusion_matrix ?? [[0, 0], [0, 0]]
    const trained = model?.trained_at ? `${readableDate(model.trained_at)} (${readableTime(model.trained_at)})` : "—"
    const now = new Date().toISOString()
    const printed = `${readableDate(now)} (${readableTime(now)})`

    const foldHead = cv.folds.map((f) => `<th>Fold ${f.fold}</th>`).join("")
    const foldRows = METRICS.map((m) => `<tr><td class="metric">${m.label}</td>${cv.folds.map((f) => `<td>${pct(f[m.key])}</td>`).join("")}<td class="metric">${pct(cv.mean[m.key])} &plusmn; ${pct(cv.std[m.key])}</td><td>${levelOf(m.key, cv.mean[m.key])} &middot; ${stabilityOf(cv.std[m.key])}</td></tr>`).join("")
    const status = overallStatus(cv)
    const statusNote = evaluation.real && !evaluation.real.enough ? " Measured on the synthetic dataset; not yet confirmed on real students." : ""

    const real = evaluation.real
    const realLine = !real
        ? "—"
        : real.enough
            ? `${pct(real.accuracy)} accuracy, ROC AUC ${real.roc_auc != null ? real.roc_auc.toFixed(3) : "—"} (${real.rows} cases, ${real.students} students)`
            : `Not yet assessed: ${real.rows ?? 0} cases with ${real.repeats ?? 0} repeats (minimum ${real.min_rows} cases and ${real.min_repeats} repeats)`
    const roman = ["I", "II", "III", "IV", "V", "VI"]
    // "How to read" blocks (EXPLAIN), printed under each figure.
    const explainHtml = (c) => `<div class="explain"><div class="explain-h">How to read this</div>
      <p>${esc(c.intro)}</p>
      <ul>${c.points.map((p) => `<li><b>${esc(p.label)}:</b> ${esc(p.text)}</li>`).join("")}</ul>
      <p><b>What it shows now:</b> ${esc(c.reading)}</p></div>`
    let n = 0
    const section = (title) => `<h3><span class="num">${roman[n++]}.</span> ${title}</h3>`

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Model Evaluation Report</title>
<style>
  @page { size: A4 portrait; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", Times, serif; color: #000; font-size: 11px; line-height: 1.5; margin: 0; }
  .sans { font-family: Arial, Helvetica, sans-serif; }
  /* Letterhead (as on the school's PDF documents). */
  .lh { display: flex; align-items: center; gap: 12px; }
  .lh img { width: 62px; height: 62px; }
  .lh .name { font-size: 16px; font-weight: bold; color: #000; }
  .lh .addr { font-size: 10px; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .lh .office { font-size: 10px; font-weight: bold; color: #000; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; font-family: Arial, Helvetica, sans-serif; }
  .lh .meta { margin-left: auto; text-align: right; font-size: 9.5px; color: #000; font-family: Arial, Helvetica, sans-serif; line-height: 1.6; }
  .rule1 { height: 3px; background: #1f3a5f; margin-top: 8px; }
  .rule2 { height: 1px; background: #b8892b; margin-top: 2px; }
  .title { text-align: center; margin: 16px 0 2px; font-size: 15px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #000; }
  .subtitle { text-align: center; font-size: 11px; color: #000; margin-bottom: 14px; }
  h3 { font-size: 11.5px; margin: 13px 0 6px; color: #000; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #9ca3af; padding-bottom: 3px; }
  h3 .num { display: inline-block; min-width: 22px; }
  p { margin: 0 0 6px; text-align: justify; }
  table { width: 100%; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
  th, td { border: 1px solid #9ca3af; padding: 3px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: bold; color: #000; }
  .info th { width: 22%; }
  .info td { width: 28%; }
  .num-cell { text-align: right; }
  .b { font-weight: bold; }
  figure { margin: 6px 0 0; page-break-inside: avoid; }
  figure img { width: 100%; border: 1px solid #d1d5db; padding: 6px; }
  figcaption { font-size: 9.5px; color: #000; text-align: center; margin-top: 3px; font-style: italic; }
  .two { display: flex; gap: 14px; align-items: flex-start; page-break-inside: avoid; }
  .two > div { flex: 1; min-width: 0; }
  .cm td, .cm th { text-align: center; }
  .cm td b { display: block; font-size: 14px; }
  .section { page-break-inside: avoid; }
  .status { border: 1px solid #9ca3af; border-left: 3px solid #1f3a5f; padding: 6px 9px; margin: 0 0 8px; background: #f9fafb; }
  .explain { margin-top: 8px; padding: 6px 9px; border: 1px solid #d1d5db; background: #fafafa; font-size: 10px; page-break-inside: avoid; }
  .explain-h { font-weight: bold; text-transform: uppercase; letter-spacing: 0.6px; font-size: 9.5px; color: #000; margin-bottom: 3px; font-family: Arial, Helvetica, sans-serif; }
  .explain p { margin: 0 0 4px; }
  .explain ul { margin: 0 0 4px; padding-left: 16px; }
  .explain li { margin: 0 0 2px; text-align: justify; }
  ol.insights { margin: 0; padding-left: 18px; }
  ol.insights li { margin: 0 0 4px; text-align: justify; page-break-inside: avoid; }
  .foot { margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 4px; page-break-inside: avoid; font-size: 8.5px; color: #000; font-family: Arial, Helvetica, sans-serif; display: flex; justify-content: space-between; }
</style></head><body>
  <div class="lh">
    <img src="${window.location.origin}/default-pic/pilar.png" alt="">
    <div>
      <div class="name">Pilar College of Zamboanga City, Inc.</div>
      <div class="addr">R.T. Lim Boulevard, Zamboanga City, 7000 &middot; College Department</div>
      <div class="office">Office of Student Affairs and Discipline</div>
    </div>
    <div class="meta">Date Printed <b>${esc(readableDate(now))}</b><br>Model Trained <b>${esc(model?.trained_at ? readableDate(model.trained_at) : "—")}</b></div>
  </div>
  <div class="rule1"></div><div class="rule2"></div>

  <div class="title">Model Evaluation Report</div>
  <div class="subtitle">Early Intervention Violation Predictor &middot; ${esc(model?.algorithm ?? "Logistic Regression")}</div>

  <div class="section">
    ${section("Model Overview")}
    <p>This report presents the evaluation of the Early Intervention Violation Predictor, which estimates the likelihood that a student commits the same violation again within the following 90 days. The model was last trained on ${esc(trained)}.</p>
    <table class="info">
      <tr><th>Dataset rows</th><td>${esc(model?.dataset_rows ?? "—")}</td><th>Violations covered</th><td>${esc(model?.violation_types ?? "—")}</td></tr>
      <tr><th>Will repeat</th><td>${esc(model?.will_repeat ?? "—")}</td><th>Will not repeat</th><td>${esc(model?.will_not_repeat ?? "—")}</td></tr>
      <tr><th>Held-out accuracy</th><td>${pct(evaluation.accuracy)}</td><th>Held-out ROC AUC</th><td>${evaluation.roc_auc.toFixed(3)}</td></tr>
      <tr><th>Precision / Recall</th><td>${evaluation.precision != null ? `${pct(evaluation.precision)} / ${pct(evaluation.recall)}` : "—"}</td><th>Held-out rows</th><td>${esc(evaluation.test_size)}</td></tr>
      <tr><th>Real students</th><td colspan="3">${esc(realLine)}</td></tr>
    </table>
  </div>

  <div class="section">
    ${section(`${cv.k}-Fold Stratified Cross-Validation`)}
    <div class="status"><b>Status: ${esc(status.label)}.</b> ${esc(status.text)}${esc(statusNote)}</div>
    ${barImg ? `<figure><img src="${barImg}"><figcaption>Figure 1. Scores of each fold.</figcaption></figure>` : ""}
    <table style="margin-top:8px"><tr><th>Metric</th>${foldHead}<th>Mean &plusmn; Std</th><th>Status</th></tr>${foldRows}</table>
    ${explainHtml(EXPLAIN.cv(cv))}
  </div>

  <div>
    ${section("Held-out Test Results")}
    <div class="two">
      <div>
        <table class="cm">
          <tr><th></th><th>Predicted: will not repeat</th><th>Predicted: will repeat</th></tr>
          <tr><th>Actual: will not repeat</th><td><b>${tn}</b>True negative</td><td><b>${fp}</b>False positive</td></tr>
          <tr><th>Actual: will repeat</th><td><b>${fn}</b>False negative</td><td><b>${tp}</b>True positive</td></tr>
        </table>
        <figcaption>Table 1. Confusion matrix of the ${esc(evaluation.test_size)} held-out rows.</figcaption>
      </div>
      <div>
        ${rocImg ? `<figure style="margin:0"><img src="${rocImg}"><figcaption>Figure 2. ROC curve (AUC ${evaluation.roc_auc.toFixed(3)}).</figcaption></figure>` : ""}
      </div>
    </div>
    ${evaluation.confusion_matrix ? explainHtml(EXPLAIN.confusion(evaluation.confusion_matrix, evaluation.test_size)) : ""}
    ${explainHtml(EXPLAIN.roc(evaluation.roc_auc, evaluation.threshold ?? 0.5))}
  </div>

  ${evaluation.calibration ? `<div class="section">
    ${section("Calibration")}
    <p>Out-of-fold predictions grouped by predicted risk, compared with the share of students who actually repeated. Brier score ${evaluation.calibration.brier.toFixed(3)}${evaluation.calibration.max_gap != null ? `; largest gap ${pct(evaluation.calibration.max_gap)}` : ""}.</p>
    <table><tr><th>Predicted risk</th><th class="num-cell">Average predicted</th><th class="num-cell">Actually repeated</th><th class="num-cell">Rows</th></tr>
    ${evaluation.calibration.bins.map((b) => `<tr><td>${b.bin.split("-").map((v) => `${Math.round(v * 100)}%`).join(" &ndash; ")}</td><td class="num-cell">${pct(b.predicted)}</td><td class="num-cell">${pct(b.observed)}</td><td class="num-cell">${b.count}</td></tr>`).join("")}</table>
    ${explainHtml(EXPLAIN.calibration(evaluation.calibration))}
  </div>` : ""}

  ${insights.length ? `<div class="section">
    ${section("Findings and Insights")}
    <ol class="insights">${insights.map((it) => `<li><b>${esc(it.title)}.</b> ${esc(it.text)}</li>`).join("")}</ol>
  </div>` : ""}

  <div class="foot"><span>Office of Student Affairs and Discipline &middot; Prefect of Discipline Management System</span><span>Printed ${esc(printed)}</span></div>
</body></html>`

    const w = window.open("", "_blank")
    if (!w) return false
    w.document.open()
    w.document.write(html)
    w.document.close()
    // Wait for the logo/chart images before opening the print dialog.
    w.onload = () => { w.focus(); w.print() }
    return true
}

// `insights`: the page's Insights list, printed at the end of the report.
const ModelEvaluationCharts = ({ evaluation, model, insights = [] }) => {
    const rootRef = useRef(null)
    if (!evaluation) {
        return (
            <Panel title="Cross-validation">
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No evaluation yet. Retrain the model to see its cross-validation results.</Typography>
            </Panel>
        )
    }
    if (!evaluation.cv) {
        return (
            <Panel title="Cross-validation">
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                    This model was trained before cross-validation was added. Retrain it to see the fold-by-fold results.
                </Typography>
            </Panel>
        )
    }

    const { cv } = evaluation
    return (
        <Box ref={rootRef} sx={{ display: "grid", gap: 2.5, minWidth: 0 }}>
            <Panel
                title={`${cv.k}-Fold Cross-Validation`}
                hint="Stratified folds over the whole dataset: each fold is scored by a model trained on the other folds."
                action={
                    <Button
                        variant="contained"
                        color="inherit"
                        disableElevation
                        startIcon={<Printer size={15} />}
                        onClick={() => {
                            if (!printReport(rootRef.current, evaluation, model, insights)) {
                                alert("Allow pop-ups for this site to print the report.")
                            }
                        }}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: "#374151", color: "#fff", "&:hover": { bgcolor: "#1f2937" } }}
                    >
                        Print Report
                    </Button>
                }
            >
                <StatusBanner cv={cv} real={evaluation.real} />
                <CrossValidationChart cv={cv} />
                <SummaryTable cv={cv} />
                <Explain content={EXPLAIN.cv(cv)} />
            </Panel>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5, minWidth: 0, alignItems: "start" }}>
                {evaluation.confusion_matrix && (
                    <Panel title="Confusion Matrix" hint={`Held-out test set of ${evaluation.test_size} rows.`}>
                        <ConfusionMatrix matrix={evaluation.confusion_matrix} />
                        <Explain content={EXPLAIN.confusion(evaluation.confusion_matrix, evaluation.test_size)} />
                    </Panel>
                )}
                {evaluation.roc_curve && (
                    <Panel title="ROC Curve" hint="Held-out test set. The further above the dashed line, the better.">
                        <RocCurve curve={evaluation.roc_curve} auc={evaluation.roc_auc} />
                        <Explain content={EXPLAIN.roc(evaluation.roc_auc, evaluation.threshold ?? 0.5)} />
                    </Panel>
                )}
            </Box>
            {evaluation.calibration && (
                <Panel
                    title="Calibration"
                    hint="Out-of-fold predictions grouped by predicted risk. When the two bars match, a predicted % can be read as a real chance."
                >
                    <CalibrationTable calibration={evaluation.calibration} />
                    <Explain content={EXPLAIN.calibration(evaluation.calibration)} />
                </Panel>
            )}
        </Box>
    )
}

export default ModelEvaluationCharts
