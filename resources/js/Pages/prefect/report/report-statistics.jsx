import QuantityCard from "@/Components/card/qntty-statistic-card"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import { BarChart3 } from "lucide-react"

const BAR_COLOR = "#3b82f6"

// Long names (violation types) would tilt and crowd the axis.
const shortLabel = (text) => (text.length > 18 ? `${text.slice(0, 17)}…` : text)

// The Statistics tab of a report page: totals as cards, then one bar chart
// per grouping. `stats` comes from ReportController::reportStats() and is
// computed over the same records (and filter) as the page's table.
const ReportStatistics = ({ stats }) => {
    if (!stats) return null

    return (
        <div className="grid gap-5 min-w-0">
            <div className={`grid gap-3 grid-cols-1 sm:grid-cols-2 ${stats.cards.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                {stats.cards.map((c) => (
                    <QuantityCard key={c.label} label={c.label} num={c.value} icon={BarChart3} />
                ))}
            </div>

            <div className="grid gap-5 grid-cols-1 xl:grid-cols-2 min-w-0">
                {stats.charts.map((chart) => (
                    <div key={chart.title} className="min-w-0">
                        {chart.data.length > 0 ? (
                            <BarGraph
                                title={chart.title}
                                label={chart.data.map((d) => shortLabel(d.label))}
                                dataset={[{ label: "Total", data: chart.data.map((d) => d.value), backgroundColor: BAR_COLOR }]}
                                height={280}
                                withBorder
                            />
                        ) : (
                            <div className="h-full min-h-[8rem] bg-white rounded-md border border-gray-300 shadow-md shadow-black/20 px-4 py-3">
                                <b className="text-[1.1em]">{chart.title}</b>
                                <p className="mt-6 text-center text-[0.85em] text-gray-500">No records for this filter.</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ReportStatistics
