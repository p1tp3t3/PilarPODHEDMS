import { useEffect, useRef, useState } from "react"
import axios from "axios"
import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import ModelEvaluationCharts, { Panel } from "@/Components/card/model-evaluation-charts"
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material"
import { useReload } from "@/context-provider/reload-provider"
import { readableDate, readableTime, showOutputModal, showWarningModal } from "@/others/function"
import { BrainCircuit, FileSearch, RefreshCw, Download, Upload, Play, AlertTriangle, Users, Lightbulb } from "lucide-react"
import { Validator } from "@/others/classes/validator"

// Model Training page body: the two models on the Python ML service.
// Early Intervention Violation Predictor — logistic regression, retrained
// from its dataset. Complaint Context Analyzer — pretrained Word2Vec, so its
// "training" is rebuilding the violation embeddings.

const errorText = (err, fallback) => err?.response?.data?.message ?? fallback
const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`)
const when = (iso) => (iso ? `${readableDate(iso)} (${readableTime(iso)})` : "Never")

const Stat = ({ label, value, hint }) => (
    <Box sx={{ border: 1, borderColor: "divider", bgcolor: "action.hover", borderRadius: 1.5, px: 1.5, py: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{label}</Typography>
        <Typography sx={{ fontWeight: 600, fontSize: "1rem", lineHeight: 1.35, overflowWrap: "anywhere" }}>{value}</Typography>
        {hint && <Typography noWrap sx={{ fontSize: "0.68rem", color: "text.disabled" }}>{hint}</Typography>}
    </Box>
)

const StatGrid = ({ cols = { xs: 2, sm: 3 }, children }) => (
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: Object.fromEntries(Object.entries(cols).map(([k, n]) => [k, `repeat(${n}, minmax(0, 1fr))`])) }}>
        {children}
    </Box>
)

// The page's buttons: one look, a colour each.
const ActionButton = ({ color = "#2563eb", hover, icon, children, ...props }) => (
    <Button
        variant="contained"
        disableElevation
        startIcon={icon}
        {...props}
        sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: color, "&:hover": { bgcolor: hover ?? color, filter: hover ? "none" : "brightness(0.92)" }, ...props.sx }}
    >
        {children}
    </Button>
)

const Note = ({ children, sx }) => (
    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.6, ...sx }}>{children}</Typography>
)

// How the predictor does on the school's REAL students (eval.real): each
// student scored by a model that never trained on them. The scores above
// come from the synthetic rows, whose labels follow a hand-set rule.
const RealDataCard = ({ real }) => {
    const enough = !!real?.enough
    return (
        <Panel icon={Users} title="Tested on real students" hint="The school's own records: was the same violation recorded again within 90 days?">
            <StatGrid cols={{ xs: 2, sm: 4 }}>
                <Stat label="Real rows" value={real?.rows ?? 0} hint={real?.students != null ? `${real.students} students` : null} />
                <Stat label="Repeated" value={real?.repeats ?? 0} hint={real?.min_repeats ? `need ${real.min_repeats}+` : null} />
                <Stat label="Accuracy" value={enough ? pct(real.accuracy) : "—"} hint={enough && real.baseline_accuracy != null ? `"never repeats" scores ${pct(real.baseline_accuracy)}` : null} />
                <Stat label="ROC AUC" value={enough && real.roc_auc != null ? real.roc_auc.toFixed(3) : "—"} hint={enough ? "0.5 = guessing" : null} />
            </StatGrid>
            <Note>
                {enough
                    ? "Each student was scored by a model trained without them, so these scores show how the predictor does on students it has not seen."
                    : `Not enough real data yet to judge the predictor on real students (at least ${real?.min_rows ?? 100} rows and ${real?.min_repeats ?? 20} repeats are needed). Until then, its scores come from the synthetic rows, which only show it learned the rule they were labelled with. Real records are added on every retrain.`}
            </Note>
        </Panel>
    )
}

// Insights drawn from the predictor's last training results: what the
// numbers mean in practice (who it catches and misses, how far its flags and
// percentages can be trusted, what drives it, how it does on real students).

// Plain names for the model's inputs, as the ML service reports them in eval.importance.
const FEATURE_NAMES = {
    past_repeat_same_violation_count: "the number of times the student has committed the violation",
    recent_same_violation_count: "repeats in the last 90 days",
    first_offense: "it being a first offense",
    months_0_1: "the last offense being within the past 2 months",
    months_2_3: "the last offense being 2 to 3 months ago",
    ladder_position: "how far along the penalty ladder the student is",
    other_violations: "the student's other violations",
    other_violations_recent: "other violations in the last 90 days",
    interventions_since_last: "interventions since the last offense",
    first_year: "being in first year",
}
const inTen = (v) => Math.round((v ?? 0) * 10)
const bandLabel = (bin) => bin.split("-").map((v) => `${Math.round(v * 100)}%`).join("–")

const buildInsights = (model) => {
    const e = model?.eval
    if (!e) return []
    const cv = e.cv?.mean ?? e
    const list = []

    // 1. Better than guessing?
    const repeatShare = model.dataset_rows ? model.will_repeat / model.dataset_rows : null
    if (repeatShare != null) {
        const baseline = Math.max(repeatShare, 1 - repeatShare)
        const lift = (e.accuracy - baseline) * 100
        list.push({
            tone: lift >= 5 ? "green" : "amber",
            title: "Better than guessing",
            text: `Only ${pct(repeatShare)} of the cases are repeats, so always answering "won't repeat" would already be right ${pct(baseline)} of the time. The model's ${pct(e.accuracy)} is ${lift.toFixed(1)} points above that${lift >= 5 ? ", so it is genuinely telling students apart." : ", a small gain over guessing."}`,
        })
    }

    // 2. Who it catches and who it misses (recall).
    list.push({
        tone: cv.recall >= 0.7 ? "green" : "amber",
        title: "Students it catches",
        text: `It identifies about ${inTen(cv.recall)} in 10 students who go on to repeat a violation (recall ${pct(cv.recall)}). The other ${10 - inTen(cv.recall)} in 10 are missed, so a student it does not flag still needs routine monitoring.`,
    })

    // 3. How often a flag is right (precision).
    list.push({
        tone: cv.precision >= 0.7 ? "green" : "amber",
        title: "How often a flag is right",
        text: `When it flags a student, it is right about ${inTen(cv.precision)} in 10 times (precision ${pct(cv.precision)}); roughly ${10 - inTen(cv.precision)} in 10 flags are false alarms. A flag is a reason to check on the student, not proof that they will repeat.`,
    })

    // 4. Its leaning (precision vs recall) and the held-out counts.
    if (e.confusion_matrix) {
        const [[tn, fp], [fn, tp]] = e.confusion_matrix
        const cautious = fn > fp
        list.push({
            tone: "gray",
            title: cautious ? "It leans toward not flagging" : "It leans toward flagging",
            text: `Of ${e.test_size} test cases it got ${tn + tp} right, raised ${fp} false alarms and missed ${fn} repeaters. ${cautious
                ? "It misses more repeaters than it falsely flags, so it is conservative; flagging at a lower risk would catch more students at the cost of more false alarms."
                : "It falsely flags more students than it misses, so it errs on the side of early intervention."}`,
        })
    }

    // 5. Ranking (ROC AUC).
    if (e.roc_auc != null) {
        list.push({
            tone: e.roc_auc >= 0.8 ? "green" : e.roc_auc >= 0.7 ? "amber" : "red",
            title: "Ranking students by risk",
            text: `Given one student who repeated and one who did not, it gives the higher risk to the right one ${pct(e.roc_auc)} of the time (ROC AUC ${e.roc_auc.toFixed(3)}). Its ordering of students by risk is more dependable than any single yes/no answer.`,
        })
    }

    // 6. What drives it (largest weights).
    if (e.importance?.length) {
        const name = (f) => FEATURE_NAMES[f.feature] ?? f.feature.replaceAll("_", " ")
        const up = e.importance.filter((f) => f.weight > 0).slice(0, 3).map(name)
        const down = e.importance.filter((f) => f.weight < 0).slice(0, 2).map(name)
        list.push({
            tone: "blue",
            title: "What drives its predictions",
            text: `The strongest signs of a repeat are ${up.join(", ").replace(/, ([^,]*)$/, " and $1")}.${down.length ? ` What lowers the risk most: ${down.join(" and ")}.` : ""}`,
        })
    }

    // 7. Consistency across folds.
    if (e.cv) {
        const worst = METRIC_NAMES.map(([k, l]) => [l, e.cv.std[k] ?? 0]).sort((a, b) => b[1] - a[1])[0]
        list.push({
            tone: worst[1] <= 0.05 ? "green" : "amber",
            title: "Consistency",
            text: `Across the ${e.cv.k} cross-validation folds the scores stay close; ${worst[0].toLowerCase()} changes the most (±${pct(worst[1])}). ${worst[1] <= 0.05 ? "The results do not depend on which students it happened to train on." : "Some results depend on which students it trained on."}`,
        })
    }

    // 8. Trust in the percentages (calibration).
    const cal = e.calibration
    if (cal?.bins?.length) {
        const big = cal.bins.filter((b) => b.count >= 20).map((b) => ({ ...b, gap: b.predicted - b.observed })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0]
        if (big) {
            list.push({
                tone: Math.abs(big.gap) <= 0.1 ? "green" : "amber",
                title: "Trust in the percentages",
                text: `Its predicted chances match what actually happened closely (Brier score ${cal.brier.toFixed(3)}). The biggest difference is for students given ${bandLabel(big.bin)}: it predicted ${pct(big.predicted)} and ${pct(big.observed)} actually repeated, so it ${big.gap > 0 ? "slightly overstates" : "slightly understates"} the risk there.`,
            })
        }
    }

    // 9. Real students.
    const real = e.real
    if (real) {
        list.push(real.enough
            ? {
                tone: (real.roc_auc ?? 0) >= 0.7 && real.accuracy >= real.baseline_accuracy ? "green" : "red",
                title: "On real students",
                text: `On ${real.rows} cases from ${real.students} real students it never trained on, it scored ${pct(real.accuracy)} (guessing "won't repeat" scores ${pct(real.baseline_accuracy)}) with a ROC AUC of ${real.roc_auc?.toFixed(3) ?? "—"}. ${(real.roc_auc ?? 0) >= 0.7 ? "Its results hold up on the school's own students." : "It does not yet do better than guessing on the school's own students."}`,
            }
            : {
                tone: "amber",
                title: "Not yet proven on real students",
                text: (() => {
                    // Only what is actually short of the minimum.
                    const short = [
                        real.rows < real.min_rows ? `${real.min_rows - real.rows} more cases (${real.rows} of ${real.min_rows})` : null,
                        real.repeats < real.min_repeats ? `${real.min_repeats - real.repeats} more repeats (${real.repeats} of ${real.min_repeats})` : null,
                    ].filter(Boolean)
                    return `Everything above comes from the synthetic dataset. The school's records so far give ${real.rows} cases with ${real.repeats} repeats; it needs ${short.length ? short.join(" and ") : "both repeats and non-repeats"} before it can be judged on real students. Until then, use its results as guidance alongside the Prefect's own judgment.`
                })(),
            })
    }
    return list
}
const METRIC_NAMES = [["accuracy", "Accuracy"], ["roc_auc", "ROC AUC"], ["precision", "Precision"], ["recall", "Recall"], ["f1", "F1"]]

const ModelInsights = ({ model }) => {
    if (!model) return null
    const insights = buildInsights(model)
    return (
        <Panel icon={Lightbulb} title="Insights" hint="What the latest training results above mean in practice">
            {insights.length === 0 ? (
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No results yet. Retrain the model to see insights from its evaluation.</Typography>
            ) : (
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.75 }}>
                    {insights.map((it) => (
                        <Stack component="li" key={it.title} direction="row" sx={{ gap: 1.5 }}>
                            <Box sx={{ mt: "7px", width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: `var(--tone-${it.tone}-fg)` }} />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{it.title}</Typography>
                                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.7, textAlign: "justify" }}>{it.text}</Typography>
                            </Box>
                        </Stack>
                    ))}
                </Box>
            )}
        </Panel>
    )
}

const ManageDatasetModel = () => {
    const { loadRegister } = useReload()
    const [status, setStatus] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [testText, setTestText] = useState("")
    const [testResult, setTestResult] = useState(null)
    const [testing, setTesting] = useState(false)
    const [tab, setTab] = useState("predictor")
    const fileRef = useRef(null)

    const loadStatus = () => {
        setLoading(true)
        setLoadError(null)
        axios.get("/maintenance/models/status")
            .then((res) => setStatus(res.data))
            .catch((err) => setLoadError(errorText(err, "Could not load the model status.")))
            .finally(() => setLoading(false))
    }

    useEffect(loadStatus, [])

    // Runs a model action behind the loading overlay, then refreshes status.
    const run = (request, waitText, doneText, failText) => {
        loadRegister(true, "text-wait", waitText)
        request()
            .then((res) => {
                loadRegister(true, "success", typeof doneText === "function" ? doneText(res.data) : doneText)
                loadStatus()
            })
            .catch((err) => loadRegister(true, "error", errorText(err, failText)))
    }

    const retrain = () => showWarningModal(
        "Retrain the Early Intervention Violation Predictor on its current dataset? Predictions switch to the new model right away.",
        "Retrain Model",
        "Cancel",
        () => run(
            () => axios.post("/maintenance/models/predictor/train"),
            "Training the model. This can take a minute...",
            (d) => `Model retrained. Held-out accuracy ${pct(d.eval?.accuracy)} (synthetic)${d.eval?.real?.enough ? `, ${pct(d.eval.real.accuracy)} on real students` : ""}.`,
            "Training failed."
        )
    )

    const download = () => {
        loadRegister(true, "text-wait", "Preparing the dataset")
        axios.get("/maintenance/models/predictor/dataset", { responseType: "blob" })
            .then((res) => {
                const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }))
                const a = document.createElement("a")
                a.href = url
                a.download = `student_violations-${new Date().toISOString().slice(0, 10)}.csv`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
                loadRegister(false)
            })
            .catch(async (err) => {
                // Blob responses hide the JSON error body; read it back out.
                let message = "The dataset could not be downloaded."
                try { message = JSON.parse(await err.response.data.text()).message ?? message } catch {}
                loadRegister(true, "error", message)
            })
    }

    const onFile = (e) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        if (!Validator.isCsv(file)) {
            showOutputModal("Please choose a CSV file.", "e")
            return
        }
        showWarningModal(
            `Replace the training dataset with "${file.name}" and retrain the model? The current dataset is kept as a backup on the ML service.`,
            "Replace & Retrain",
            "Cancel",
            () => {
                const f = new FormData()
                f.append("file", file)
                run(
                    () => axios.post("/maintenance/models/predictor/dataset", f),
                    "Uploading the dataset and retraining...",
                    (d) => `Dataset replaced (${d.model?.dataset_rows ?? "?"} rows) and model retrained. Accuracy ${pct(d.eval?.accuracy)}.`,
                    "The dataset could not be uploaded."
                )
            }
        )
    }

    const rebuild = () => showWarningModal(
        "Rebuild the Complaint Context Analyzer's violation embeddings from the current violation list?",
        "Rebuild",
        "Cancel",
        () => run(
            () => axios.post("/maintenance/models/analyzer/rebuild"),
            "Rebuilding violation embeddings...",
            (d) => `Embeddings rebuilt for ${d.model?.embedded ?? "?"} violations.`,
            "Rebuilding the embeddings failed."
        )
    )

    const runTest = (e) => {
        e?.preventDefault?.()
        if (!testText.trim() || testing) return
        setTesting(true)
        setTestResult(null)
        axios.post("/maintenance/models/analyzer/test", { complaint_text: testText.trim() })
            .then((res) => {
                const raw = res.data?.data
                setTestResult(typeof raw === "string" ? JSON.parse(raw || "[]") : (raw ?? []))
            })
            .catch((err) => showOutputModal(errorText(err, "The analyzer could not process this text."), "e"))
            .finally(() => setTesting(false))
    }

    const p = status?.eivp
    const c = status?.cca

    return (
        <PageLayout title="Model Training">
        <Box sx={{ display: "grid", gap: 2.5, minWidth: 0 }}>

            {loadError && (
                <Alert severity="warning" icon={<AlertTriangle size={18} />} sx={{ borderRadius: 2 }}>{loadError}</Alert>
            )}

            {/* The tabs, with Refresh at the end of the same row. */}
            <Stack direction="row" sx={{ alignItems: "flex-end", gap: 1.5, minWidth: 0 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TabSwitcher
                        tabs={[
                            { key: "predictor", label: "Violation Predictor", icon: BrainCircuit },
                            { key: "analyzer", label: "Complaint Analyzer", icon: FileSearch },
                        ]}
                        value={tab}
                        onChange={setTab}
                    />
                </Box>
                <Box sx={{ pb: 0.75, flexShrink: 0 }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={loadStatus}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={15} />}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: "divider", color: "text.secondary", minWidth: 0, "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } } }}
                    >
                        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Refresh</Box>
                    </Button>
                </Box>
            </Stack>

            {tab === "predictor" && (
            <Box sx={{ display: "grid", gap: 2.5, minWidth: 0 }}>
                <Panel icon={BrainCircuit} title="Early Intervention Violation Predictor" hint={p?.algorithm ?? "Logistic Regression"}>
                    <StatGrid>
                        <Stat label="Dataset rows" value={p?.dataset_rows ?? "—"} hint={p?.violation_types != null ? `${p.violation_types} violation types` : null} />
                        <Stat label="Will repeat" value={p?.will_repeat ?? "—"} />
                        <Stat label="Won't repeat" value={p?.will_not_repeat ?? "—"} />
                        <Stat label="Accuracy (synthetic)" value={pct(p?.eval?.accuracy)} hint={p?.eval?.test_size ? `on ${p.eval.test_size} held-out rows` : null} />
                        <Stat label="ROC AUC (synthetic)" value={p?.eval?.roc_auc != null ? p.eval.roc_auc.toFixed(3) : "—"} />
                        <Stat label="Last trained" value={p ? when(p.trained_at) : "—"} hint={p?.trained_rows ? `${p.trained_rows} rows` : null} />
                    </StatGrid>
                    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                        <ActionButton icon={<Play size={15} />} onClick={retrain} disabled={!status}>Retrain Model</ActionButton>
                        <ActionButton icon={<Download size={15} />} color="#4f46e5" onClick={download} disabled={!status}>Download Dataset</ActionButton>
                        <ActionButton icon={<Upload size={15} />} color="#059669" onClick={() => fileRef.current?.click()} disabled={!status}>Upload Dataset</ActionButton>
                        <input ref={fileRef} type="file" accept=".csv" hidden onChange={onFile} />
                    </Stack>
                    <Note sx={{ fontSize: "0.7rem" }}>
                        CSV columns: violation_id, past_repeat_same_violation_count, recent_same_violation_count,
                        months_since_last_same_violation, will_repeat_the_same_violation (0 or 1). Optional: student_id (identifies the row, not used to predict), max_offense_level,
                        other_violations_count, other_violations_recent_count, interventions_since_last, year_level. At least 20 rows.
                        This is the synthetic dataset; the school's real records are added automatically on every retrain.
                    </Note>
                </Panel>

                <RealDataCard real={p?.eval?.real ?? (p ? { rows: p.real_rows, repeats: p.real_repeats } : null)} />

                <ModelEvaluationCharts evaluation={p?.eval} model={p} insights={buildInsights(p)} />

                {/* Last: it reads all the results above, the charts included. */}
                <ModelInsights model={p} />
            </Box>
            )}

            {tab === "analyzer" && (
            <Box sx={{ display: "grid", gap: 2.5, minWidth: 0, maxWidth: "52rem" }}>
                <Panel icon={FileSearch} title="Complaint Context Analyzer" hint={c?.algorithm ?? "Word2Vec + cosine similarity"}>
                    <StatGrid cols={{ xs: 2, sm: 4 }}>
                        <Stat label="Violations" value={c?.violations ?? "—"} />
                        <Stat label="Embedded" value={c?.embedded ?? "—"} />
                        <Stat label="With keywords" value={c?.with_keywords ?? "—"} />
                        <Stat label="Last rebuilt" value={c ? when(c.embedded_at) : "—"} />
                    </StatGrid>
                    {c?.not_embedded?.length > 0 && (
                        <Alert severity="warning" sx={{ borderRadius: 2, fontSize: "0.78rem" }}>
                            Not embedded (no known words): {c.not_embedded.join(", ")}. Add keywords to these violations, then rebuild.
                        </Alert>
                    )}
                    <Box>
                        <ActionButton icon={<RefreshCw size={15} />} onClick={rebuild} disabled={!status}>Rebuild Embeddings</ActionButton>
                    </Box>

                    <Box component="form" onSubmit={runTest} sx={{ display: "grid", gap: 1.25, borderTop: 1, borderColor: "divider", pt: 2 }}>
                        <Typography component="label" htmlFor="cca-test" sx={{ fontSize: "0.82rem", fontWeight: 600 }}>Test the analyzer</Typography>
                        <TextField
                            id="cca-test"
                            multiline
                            minRows={3}
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            placeholder="Type a sample complaint, e.g. The student was caught leaving campus during class hours without a gate pass."
                            fullWidth
                            size="small"
                            sx={{ "& .MuiInputBase-input": { fontSize: "0.85rem", boxShadow: "none !important", outline: "none !important" } }}
                        />
                        <Box>
                            <ActionButton
                                type="submit"
                                color="#374151"
                                disabled={testing || !testText.trim()}
                                icon={testing ? <CircularProgress size={14} color="inherit" /> : null}
                            >
                                {testing ? "Analyzing..." : "Analyze"}
                            </ActionButton>
                        </Box>
                        {testResult && (
                            testResult.length === 0
                                ? <Note sx={{ fontSize: "0.8rem" }}>No match: none of the words are known to the model.</Note>
                                : (
                                    <Box sx={{ display: "grid", gap: 0.75 }}>
                                        {testResult.slice(0, 5).map((r, i) => (
                                            <Stack key={i} direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 0.75 }}>
                                                <Typography noWrap sx={{ fontSize: "0.8rem" }}>{r.violation}</Typography>
                                                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", flexShrink: 0 }}>{(r.similarity * 100).toFixed(0)}% · {r.status}</Typography>
                                            </Stack>
                                        ))}
                                    </Box>
                                )
                        )}
                    </Box>
                </Panel>
            </Box>
            )}
        </Box>
        </PageLayout>
    )
}

export default ManageDatasetModel
