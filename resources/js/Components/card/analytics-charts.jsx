import { Bar, Doughnut, Line } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend } from "chart.js"

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend)

// Shared chart blocks for the report pages (Analytical Report, each report's
// Statistics): one white card style, count axes that start at 0 in whole
// numbers, and the same empty state.

export const ChartCard = ({ title, subtitle, children, className = "" }) => (
  <section className={`bg-white rounded-md shadow-black/20 shadow-sm p-4 min-w-0 flex flex-col ${className}`}>
    <div className="mb-3">
      <h2 className="text-[1em] font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-[0.78em] text-gray-500">{subtitle}</p>}
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </section>
)

export const NoData = ({ label = "No data for this period" }) => (
  <div className="h-full min-h-[8rem] grid place-items-center text-[0.85em] text-gray-400">{label}</div>
)

const countAxis = { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(148,163,184,0.15)" } }

export const BarChart = ({ labels, values, colors, horizontal = false, height = 240, onBarClick }) => {
  if (!values.some((v) => v > 0)) return <NoData />
  return (
    <div style={{ height }} className="relative">
      <Bar
        data={{ labels, datasets: [{ data: values, backgroundColor: colors ?? "#3b82f6", borderRadius: 4, maxBarThickness: 42 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: horizontal ? "y" : "x",
          plugins: { legend: { display: false } },
          scales: horizontal
            ? { x: countAxis, y: { grid: { display: false }, ticks: { autoSkip: false } } }
            : { y: countAxis, x: { grid: { display: false } } },
          onClick: onBarClick ? (_, els) => els[0] && onBarClick(labels[els[0].index]) : undefined,
          onHover: onBarClick ? (e, els) => { e.native.target.style.cursor = els[0] ? "pointer" : "default" } : undefined,
        }}
      />
    </div>
  )
}

// One series over time (e.g. per month), filled under the line.
export const LineChart = ({ labels, values, color = "#1e3a8a", height = 260 }) => {
  if (!values.some((v) => v > 0)) return <NoData />
  return (
    <div style={{ height }} className="relative">
      <Line
        data={{ labels, datasets: [{ data: values, borderColor: color, backgroundColor: `${color}22`, fill: true, tension: 0.3, pointRadius: 3 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          interaction: { mode: "index", intersect: false },
          scales: { y: countAxis, x: { grid: { display: false } } },
        }}
      />
    </div>
  )
}

// A doughnut with the total in the hole; items: [{ label, total }].
export const DoughnutChart = ({ items, colors, height = 220 }) => {
  const total = items.reduce((n, i) => n + i.total, 0)
  if (total === 0) return <NoData />
  return (
    <div className="relative" style={{ height }}>
      <Doughnut
        data={{ labels: items.map((i) => i.label), datasets: [{ data: items.map((i) => i.total), backgroundColor: colors, borderWidth: 0 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
            tooltip: { callbacks: { label: (c) => `${c.label}: ${c.raw} (${Math.round((c.raw / total) * 100)}%)` } },
          },
        }}
      />
      <div className="absolute inset-x-0 top-[38%] -translate-y-1/2 text-center pointer-events-none">
        <div className="text-[1.4em] font-bold text-gray-900 leading-none">{total}</div>
        <div className="text-[0.7em] text-gray-500">total</div>
      </div>
    </div>
  )
}

export const DoughnutCard = ({ title, subtitle, items, colors }) => (
  <ChartCard title={title} subtitle={subtitle}>
    <DoughnutChart items={items} colors={colors} />
  </ChartCard>
)
