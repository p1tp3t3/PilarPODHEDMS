import { useEffect, useRef, useState } from "react"
import axios from "axios"
import ActionBtn from "@/Components/button/action-btn"
import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import ModelEvaluationCharts from "@/Components/card/model-evaluation-charts"
import { useReload } from "@/context-provider/reload-provider"
import { readableDate, readableTime, showOutputModal, showWarningModal } from "@/others/function"
import { BrainCircuit, FileSearch, RefreshCw, Download, Upload, Play, AlertTriangle } from "lucide-react"

// Model Training page body: the two models on the Python ML service.
// Early Intervention Violation Predictor — logistic regression, retrained
// from its dataset. Complaint Context Analyzer — pretrained Word2Vec, so its
// "training" is rebuilding the violation embeddings.

const errorText = (err, fallback) => err?.response?.data?.message ?? fallback
const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`)
const when = (iso) => (iso ? `${readableDate(iso)} (${readableTime(iso)})` : "Never")

const Stat = ({ label, value, hint }) => (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 min-w-0">
        <div className="text-[0.7em] text-gray-500">{label}</div>
        <div className="font-semibold text-gray-800 truncate">{value}</div>
        {hint && <div className="text-[0.65em] text-gray-400 truncate">{hint}</div>}
    </div>
)

const ModelCard = ({ icon: Icon, title, subtitle, children }) => (
    <div className="bg-white border border-gray-200 rounded-md p-5 grid gap-4 min-w-0">
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <div className="font-semibold text-gray-800">{title}</div>
                <div className="text-[0.8em] text-gray-500">{subtitle}</div>
            </div>
        </div>
        {children}
    </div>
)

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
            (d) => `Model retrained. Held-out accuracy ${pct(d.eval?.accuracy)}.`,
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
        if (!file.name.toLowerCase().endsWith(".csv")) {
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
        <PageLayout
            title="Model Training"
            rightSideComponent={
                <ActionBtn className="bg-gray-600 hover:bg-gray-700 text-white" onClick={loadStatus} disabled={loading}>
                    <span className="inline-flex items-center gap-1.5"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</span>
                </ActionBtn>
            }
        >
        <div className="grid gap-5 min-w-0">

            {loadError && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[0.85em] text-amber-800">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{loadError}</span>
                </div>
            )}

            <TabSwitcher
                tabs={[
                    { key: "predictor", label: "Violation Predictor", icon: BrainCircuit },
                    { key: "analyzer", label: "Complaint Analyzer", icon: FileSearch },
                ]}
                value={tab}
                onChange={setTab}
            />

            {tab === "predictor" && (
            <div className="grid gap-5 min-w-0">
                <ModelCard icon={BrainCircuit} title="Early Intervention Violation Predictor" subtitle={p?.algorithm ?? "Logistic Regression"}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Stat label="Dataset rows" value={p?.dataset_rows ?? "—"} hint={p?.violation_types != null ? `${p.violation_types} violation types` : null} />
                        <Stat label="Will repeat" value={p?.will_repeat ?? "—"} />
                        <Stat label="Won't repeat" value={p?.will_not_repeat ?? "—"} />
                        <Stat label="Accuracy" value={pct(p?.eval?.accuracy)} hint={p?.eval?.test_size ? `on ${p.eval.test_size} held-out rows` : null} />
                        <Stat label="ROC AUC" value={p?.eval?.roc_auc != null ? p.eval.roc_auc.toFixed(3) : "—"} />
                        <Stat label="Last trained" value={p ? when(p.trained_at) : "—"} hint={p?.trained_rows ? `${p.trained_rows} rows` : null} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <ActionBtn className="bg-blue-600 hover:bg-blue-700 text-white" onClick={retrain} disabled={!status}>
                            <span className="inline-flex items-center gap-1.5"><Play size={13} /> Retrain Model</span>
                        </ActionBtn>
                        <ActionBtn className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={download} disabled={!status}>
                            <span className="inline-flex items-center gap-1.5"><Download size={13} /> Download Dataset</span>
                        </ActionBtn>
                        <ActionBtn className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => fileRef.current?.click()} disabled={!status}>
                            <span className="inline-flex items-center gap-1.5"><Upload size={13} /> Upload Dataset</span>
                        </ActionBtn>
                        <input ref={fileRef} type="file" accept=".csv" hidden onChange={onFile} />
                    </div>
                    <p className="text-[0.7em] text-gray-500">
                        CSV columns: violation_type, past_repeat_same_violation_count, recent_same_violation_count,
                        months_since_last_same_violation, will_repeat_the_same_violation (0 or 1). At least 20 rows.
                    </p>
                </ModelCard>

                <ModelEvaluationCharts evaluation={p?.eval} model={p} />
            </div>
            )}

            {tab === "analyzer" && (
            <div className="grid gap-5 min-w-0 max-w-[52rem]">
                <ModelCard icon={FileSearch} title="Complaint Context Analyzer" subtitle={c?.algorithm ?? "Word2Vec + cosine similarity"}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Stat label="Violations" value={c?.violations ?? "—"} />
                        <Stat label="Embedded" value={c?.embedded ?? "—"} />
                        <Stat label="With keywords" value={c?.with_keywords ?? "—"} />
                        <Stat label="Last rebuilt" value={c ? when(c.embedded_at) : "—"} />
                    </div>
                    {c?.not_embedded?.length > 0 && (
                        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[0.75em] text-amber-800">
                            Not embedded (no known words): {c.not_embedded.join(", ")}. Add keywords to these violations, then rebuild.
                        </div>
                    )}
                    <div>
                        <ActionBtn className="bg-blue-600 hover:bg-blue-700 text-white" onClick={rebuild} disabled={!status}>
                            <span className="inline-flex items-center gap-1.5"><RefreshCw size={13} /> Rebuild Embeddings</span>
                        </ActionBtn>
                    </div>

                    <form onSubmit={runTest} className="grid gap-2 border-t border-gray-100 pt-4">
                        <label htmlFor="cca-test" className="text-[0.8em] font-semibold text-gray-700">Test the analyzer</label>
                        <textarea
                            id="cca-test"
                            rows={3}
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            placeholder="Type a sample complaint, e.g. The student was caught leaving campus during class hours without a gate pass."
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[0.85em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                            <ActionBtn onClick={runTest} className="bg-gray-700 hover:bg-gray-800 text-white" disabled={testing || !testText.trim()}>
                                {testing ? "Analyzing..." : "Analyze"}
                            </ActionBtn>
                        </div>
                        {testResult && (
                            testResult.length === 0
                                ? <div className="text-[0.8em] text-gray-500">No match: none of the words are known to the model.</div>
                                : (
                                    <div className="grid gap-1">
                                        {testResult.slice(0, 5).map((r, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 rounded border border-gray-200 px-3 py-1.5 text-[0.8em]">
                                                <span className="truncate">{r.violation}</span>
                                                <span className="shrink-0 text-gray-500">{(r.similarity * 100).toFixed(0)}% · {r.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )
                        )}
                    </form>
                </ModelCard>
            </div>
            )}
        </div>
        </PageLayout>
    )
}

export default ManageDatasetModel
