import { useMemo, useRef } from "react"
import { Printer } from "lucide-react"
import ActionBtn from "@/Components/button/action-btn"
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

const METRICS = [
    { key: "accuracy", label: "Accuracy", color: "#2563eb" },
    { key: "roc_auc", label: "ROC AUC", color: "#16a34a" },
    { key: "precision", label: "Precision", color: "#d97706" },
    { key: "recall", label: "Recall", color: "#dc2626" },
    { key: "f1", label: "F1", color: "#7c3aed" },
]

const pct = (v) => `${(v * 100).toFixed(1)}%`

const Panel = ({ title, hint, action, children }) => (
    <div className="bg-white border border-gray-200 rounded-md p-5 grid gap-3 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <div className="font-semibold text-gray-800">{title}</div>
                {hint && <div className="text-[0.75em] text-gray-500">{hint}</div>}
            </div>
            {action}
        </div>
        {children}
    </div>
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
        <div className="h-[18rem]">
            <Bar data={data} options={BAR_OPTIONS} />
        </div>
    )
}

const SummaryTable = ({ cv }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-[0.8em] border-collapse">
            <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-1.5 pr-3 font-medium">Metric</th>
                    {cv.folds.map((f) => <th key={f.fold} className="py-1.5 px-2 font-medium">Fold {f.fold}</th>)}
                    <th className="py-1.5 pl-2 font-medium">Mean ± Std</th>
                </tr>
            </thead>
            <tbody>
                {METRICS.map((m) => (
                    <tr key={m.key} className="border-b border-gray-100">
                        <td className="py-1.5 pr-3 font-semibold" style={{ color: m.color }}>{m.label}</td>
                        {cv.folds.map((f) => <td key={f.fold} className="py-1.5 px-2">{pct(f[m.key])}</td>)}
                        <td className="py-1.5 pl-2 font-semibold whitespace-nowrap">{pct(cv.mean[m.key])} ± {pct(cv.std[m.key])}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

const ConfusionMatrix = ({ matrix }) => {
    const [[tn, fp], [fn, tp]] = matrix
    const max = Math.max(tn, fp, fn, tp) || 1
    const Cell = ({ value, label, good }) => (
        <div
            className="rounded-md p-3 text-center"
            style={{ backgroundColor: good ? `rgba(22,163,74,${0.12 + 0.5 * value / max})` : `rgba(220,38,38,${0.08 + 0.4 * value / max})` }}
        >
            <div className="text-[1.4em] font-bold text-gray-900">{value}</div>
            <div className="text-[0.7em] text-gray-700">{label}</div>
        </div>
    )
    return (
        <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center text-[0.75em]">
            <div />
            <div className="text-center text-gray-500">Predicted: won't repeat</div>
            <div className="text-center text-gray-500">Predicted: will repeat</div>
            <div className="text-gray-500 text-right pr-1">Actual: won't repeat</div>
            <Cell value={tn} label="True negative" good />
            <Cell value={fp} label="False positive" />
            <div className="text-gray-500 text-right pr-1">Actual: will repeat</div>
            <Cell value={fn} label="False negative" />
            <Cell value={tp} label="True positive" good />
        </div>
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
        <div className="h-[16rem]">
            <Line data={data} options={ROC_OPTIONS} />
        </div>
    )
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))

// Printable report: built from the data (not the on-screen Tailwind layout),
// with the two charts copied in as images, then the browser print dialog.
const printReport = (root, evaluation, model) => {
    const [barImg, rocImg] = [...root.querySelectorAll("canvas")].map((c) => c.toDataURL("image/png"))
    const { cv } = evaluation
    const [[tn, fp], [fn, tp]] = evaluation.confusion_matrix ?? [[0, 0], [0, 0]]
    const trained = model?.trained_at ? `${readableDate(model.trained_at)} (${readableTime(model.trained_at)})` : "—"
    const now = new Date().toISOString()
    const printed = `${readableDate(now)} (${readableTime(now)})`

    const foldHead = cv.folds.map((f) => `<th>Fold ${f.fold}</th>`).join("")
    const foldRows = METRICS.map((m) => `<tr><td class="metric">${m.label}</td>${cv.folds.map((f) => `<td>${pct(f[m.key])}</td>`).join("")}<td class="metric">${pct(cv.mean[m.key])} &plusmn; ${pct(cv.std[m.key])}</td></tr>`).join("")

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Model Evaluation Report</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 11px; margin: 0; }
  .head { text-align: center; border-bottom: 2px solid #003366; padding-bottom: 8px; margin-bottom: 12px; }
  .head img { width: 64px; }
  .head h1 { font-size: 15px; margin: 4px 0 2px; color: #003366; }
  .head p { margin: 0; color: #555; }
  h2 { font-size: 14px; margin: 0 0 2px; color: #003366; text-align: center; }
  .sub { text-align: center; color: #666; margin-bottom: 12px; }
  h3 { font-size: 12px; margin: 14px 0 6px; color: #003366; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  th { background: #f0f4f8; }
  .metric { font-weight: bold; }
  .info td { width: 25%; }
  .chart { width: 100%; border: 1px solid #ddd; padding: 6px; }
  .two { display: flex; gap: 12px; align-items: flex-start; page-break-inside: avoid; }
  .two > div { flex: 1; }
  .cm td { text-align: center; padding: 10px 6px; }
  .cm .good { background: #dcfce7; } .cm .bad { background: #fee2e2; }
  .cm b { font-size: 16px; display: block; }
  .section { page-break-inside: avoid; }
  .foot { margin-top: 14px; color: #777; font-size: 10px; text-align: right; }
</style></head><body>
  <div class="head">
    <img src="${window.location.origin}/default-pic/pilar.png" alt="">
    <h1>Pilar College of Zamboanga City, Inc.</h1>
    <p>R.T. Lim Boulevard, Zamboanga City &middot; Higher Education Department</p>
  </div>
  <h2>Early Intervention Violation Predictor &mdash; Evaluation Report</h2>
  <div class="sub">${esc(model?.algorithm ?? "Logistic Regression")} &middot; Last trained ${esc(trained)}</div>

  <table class="info">
    <tr><th>Dataset rows</th><td>${esc(model?.dataset_rows ?? "—")}</td><th>Violation types</th><td>${esc(model?.violation_types ?? "—")}</td></tr>
    <tr><th>Will repeat</th><td>${esc(model?.will_repeat ?? "—")}</td><th>Won't repeat</th><td>${esc(model?.will_not_repeat ?? "—")}</td></tr>
    <tr><th>Held-out accuracy</th><td>${pct(evaluation.accuracy)}</td><th>Held-out ROC AUC</th><td>${evaluation.roc_auc.toFixed(3)}</td></tr>
    <tr><th>Precision / Recall</th><td>${evaluation.precision != null ? `${pct(evaluation.precision)} / ${pct(evaluation.recall)}` : "—"}</td><th>Held-out rows</th><td>${esc(evaluation.test_size)}</td></tr>
  </table>

  <div class="section">
    <h3>${cv.k}-Fold Stratified Cross-Validation</h3>
    ${barImg ? `<img class="chart" src="${barImg}">` : ""}
    <table style="margin-top:6px"><tr><th>Metric</th>${foldHead}<th>Mean &plusmn; Std</th></tr>${foldRows}</table>
  </div>

  <div class="two">
    <div>
      <h3>Confusion Matrix (held-out)</h3>
      <table class="cm">
        <tr><th></th><th>Predicted: won't repeat</th><th>Predicted: will repeat</th></tr>
        <tr><th>Actual: won't repeat</th><td class="good"><b>${tn}</b>True negative</td><td class="bad"><b>${fp}</b>False positive</td></tr>
        <tr><th>Actual: will repeat</th><td class="bad"><b>${fn}</b>False negative</td><td class="good"><b>${tp}</b>True positive</td></tr>
      </table>
    </div>
    <div>
      <h3>ROC Curve (held-out)</h3>
      ${rocImg ? `<img class="chart" src="${rocImg}">` : ""}
    </div>
  </div>

  <div class="foot">Printed ${esc(printed)}</div>
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

const ModelEvaluationCharts = ({ evaluation, model }) => {
    const rootRef = useRef(null)
    if (!evaluation) {
        return (
            <Panel title="Cross-validation">
                <div className="text-[0.85em] text-gray-500">No evaluation yet. Retrain the model to see its cross-validation results.</div>
            </Panel>
        )
    }
    if (!evaluation.cv) {
        return (
            <Panel title="Cross-validation">
                <div className="text-[0.85em] text-gray-500">
                    This model was trained before cross-validation was added. Retrain it to see the fold-by-fold results.
                </div>
            </Panel>
        )
    }

    const { cv } = evaluation
    return (
        <div ref={rootRef} className="grid gap-5 min-w-0">
            <Panel
                title={`${cv.k}-Fold Cross-Validation`}
                hint="Stratified folds over the whole dataset: each fold is scored by a model trained on the other folds."
                action={
                    <ActionBtn
                        className="bg-gray-700 hover:bg-gray-800 text-white"
                        onClick={() => {
                            if (!printReport(rootRef.current, evaluation, model)) {
                                alert("Allow pop-ups for this site to print the report.")
                            }
                        }}
                    >
                        <span className="inline-flex items-center gap-1.5"><Printer size={13} /> Print Report</span>
                    </ActionBtn>
                }
            >
                <CrossValidationChart cv={cv} />
                <SummaryTable cv={cv} />
            </Panel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
                {evaluation.confusion_matrix && (
                    <Panel title="Confusion Matrix" hint={`Held-out test set of ${evaluation.test_size} rows.`}>
                        <ConfusionMatrix matrix={evaluation.confusion_matrix} />
                    </Panel>
                )}
                {evaluation.roc_curve && (
                    <Panel title="ROC Curve" hint="Held-out test set. The further above the dashed line, the better.">
                        <RocCurve curve={evaluation.roc_curve} auc={evaluation.roc_auc} />
                    </Panel>
                )}
            </div>
        </div>
    )
}

export default ModelEvaluationCharts
