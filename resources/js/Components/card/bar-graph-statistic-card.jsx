import { Bar, getElementAtEvent } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js"
import { useRef } from "react"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const BarGraph = (props) => {
  const chartRef = useRef(null) // ref for the chart instance
  const labels = props.label

  const chartData = {
    labels: labels,
    datasets: props.dataset,
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: !props.height,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: props.xTitle,
        },
      },
      y: {
        title: {
          display: true,
          text: props.yTitle,
        },
      },
    },
  }

  // Handle click event
  const handleClick = (event) => {
    const chart = chartRef.current
    if (!chart) return

    const element = getElementAtEvent(chart, event) // get clicked bar
    if (element.length > 0) {
      const { datasetIndex, index } = element[0]
      const dataset = chartData.datasets[datasetIndex]
      const label = chartData.labels[index]
      const value = dataset.data[index]

      // Call parent handler if provided
      if (props.onBarClick) {
        props.onBarClick({ label, value, dataset })
      } else {
        console.log("Clicked:", { label, value, dataset })
      }
    }
  }

  return (
    <div
      className={`${props.w} h-full min-w-0 px-4 py-3 bg-white ${props.bg} ${
        props.withBorder
          ? "border rounded-md shadow-md shadow-black/20 border-gray-300"
          : ""
      }`}
    >
      <div className="text-[1.1em] flex flex-wrap items-start justify-between gap-2">
        <h1 className="min-w-0 w-full sm:w-auto max-w-full">
          <b>{props.title}</b>
        </h1>
        <div className="w-full sm:w-auto max-w-full">{props.side}</div>
      </div>

      {/* Chart with click event — a fixed-height box when `height` is set,
          so the canvas can't grow past its card on narrow screens. */}
      <div className="relative w-full min-w-0 mt-2" style={props.height ? { height: props.height } : undefined}>
        <Bar
          ref={chartRef}
          data={chartData}
          options={chartOptions}
          onClick={handleClick}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

export default BarGraph
