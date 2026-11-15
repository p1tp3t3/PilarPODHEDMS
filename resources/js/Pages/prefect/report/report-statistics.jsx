import QuantityCard from "@/Components/card/qntty-statistic-card"
import { ChartCard, BarChart, LineChart, DoughnutChart, NoData } from "@/Components/card/analytics-charts"
import {
    AlertTriangle, BarChart3, Calendar, CheckCircle2, Clock, DoorOpen, List, Percent, Repeat, ShieldAlert, User, Users, XCircle,
} from "lucide-react"

// The Statistics tab of a report page: key figures, then its charts.
// `stats` comes from ReportController::reportStats() and is computed over
// the same records (and filter) as the page's table:
//   cards:  [{ label, value, hint?, icon }]
//   charts: [{ title, subtitle?, type: bar | hbar | line | doughnut, data: [{ label, value, color? }], wide? }]

const ICONS = {
    alert: AlertTriangle, chart: BarChart3, calendar: Calendar, check: CheckCircle2, clock: Clock, door: DoorOpen,
    list: List, percent: Percent, repeat: Repeat, shield: ShieldAlert, user: User, users: Users, x: XCircle,
}
const PALETTE = ["#3b82f6", "#6366f1", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#9ca3af"]
const BAR_COLORS = { bar: "#3b82f6", hbar: "#6366f1" }

// Long names (violation types) would crowd the axis.
const shortLabel = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

const Chart = ({ chart }) => {
    const data = chart.data ?? []
    if (!data.length) return <NoData label="No records for this filter" />
    const labels = data.map((d) => d.label)
    const values = data.map((d) => d.value)
    const colors = data.some((d) => d.color) ? data.map((d) => d.color ?? BAR_COLORS[chart.type]) : BAR_COLORS[chart.type]

    switch (chart.type) {
        case "line":
            return <LineChart labels={labels} values={values} />
        case "doughnut":
            return <DoughnutChart items={data.map((d) => ({ label: d.label, total: d.value }))} colors={data.map((d, i) => d.color ?? PALETTE[i % PALETTE.length])} />
        case "hbar":
            return <BarChart horizontal labels={labels.map((l) => shortLabel(l, 34))} values={values} colors={colors} height={Math.max(160, data.length * 30)} />
        default:
            return <BarChart labels={labels.map((l) => shortLabel(l, 18))} values={values} colors={colors} />
    }
}

const ReportStatistics = ({ stats }) => {
    if (!stats) return null
    const cols = stats.cards.length >= 5 ? "xl:grid-cols-5" : stats.cards.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"

    return (
        <div className="grid gap-4 sm:gap-5 min-w-0">
            <div className={`grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${cols}`}>
                {stats.cards.map((c) => (
                    <QuantityCard
                        key={c.label}
                        label={c.hint ? `${c.label} · ${c.hint}` : c.label}
                        num={c.value}
                        icon={ICONS[c.icon] ?? BarChart3}
                    />
                ))}
            </div>

            <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2 min-w-0">
                {stats.charts.map((chart) => (
                    <ChartCard key={chart.title} title={chart.title} subtitle={chart.subtitle} className={chart.wide ? "lg:col-span-2" : ""}>
                        <Chart chart={chart} />
                    </ChartCard>
                ))}
            </div>
        </div>
    )
}

export default ReportStatistics
