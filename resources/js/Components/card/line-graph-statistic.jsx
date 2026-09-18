import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement, Filler } from "chart.js";
import { ChevronDown } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);


ChartJS.register(CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

// Dims a hex color for the un-selected lines when one legend entry is
// picked — left untouched for non-hex colors (rgba/named) so single-line
// charts elsewhere that never select anything are unaffected.
const dim = (color, alpha) => {
  if (typeof color !== "string" || !color.startsWith("#")) return color
  const hex = color.replace("#", "")
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex
  const value = parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const LineGraph = (props) => {
  const labels = props.label
  // Which type indices are checked — defaults to every type so "All Types"
  // and every individual box start in sync (all checked, nothing dimmed).
  const [selected, setSelected] = useState(() => props.dataset.map((_, i) => i))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Re-sync to "everything checked" whenever the set of types itself
  // changes (e.g. a date filter produces a different list of types) —
  // otherwise stale indices from the old list would linger in `selected`.
  const typeKey = props.dataset.map((d) => d.label).join("|")
  useEffect(() => {
    setSelected(props.dataset.map((_, i) => i))
  }, [typeKey])

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", onOutsideClick)
    return () => document.removeEventListener("mousedown", onOutsideClick)
  }, [])

  const toggleSelected = (idx) => {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  const allChecked = selected.length === props.dataset.length

  const chartData = {
    labels: labels,
    datasets: props.dataset.map((d, i) => {
      const isChecked = selected.includes(i)
      const isDimmed = !allChecked && !isChecked
      const isHighlighted = !allChecked && isChecked

      return {
        ...d,
        borderColor: isDimmed ? dim(d.borderColor, 0.15) : d.borderColor,
        backgroundColor: isDimmed ? dim(d.backgroundColor, 0.1) : d.backgroundColor,
        borderWidth: isHighlighted ? 3 : 2,
        order: isHighlighted ? -1 : 0,
      }
    }),
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        filter: (item) => selected.includes(item.datasetIndex),
        callbacks: {
          title: (items) => items[0]?.label,
        },
      },
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
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
        beginAtZero: true,
        title: {
          display: true,
          text: props.yTitle,
        },
        ticks: {
          precision: 0,
        },
      },
    },
  }
    
  return (
    <div className={`${props.w} h-full px-4 py-3 ${props.bg} ${props.withBorder ? 'border rounded-md shadow-md shadow-black/20 border-gray-300' : ''}`}>
        <div className="text-[1.1em] flex justify-between items-center gap-2">
            <h1><b>{props.title}</b></h1>
            <div className="flex items-center gap-2">
                {props.dataset.length > 1 && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            className="flex items-center gap-1 text-[0.8em] border border-gray-300 rounded-md px-2 py-1 bg-white hover:bg-gray-50"
                        >
                            {allChecked ? "All Types" : `${selected.length} Selected`}
                            <ChevronDown size="0.9em" />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
                                <label className="flex items-center gap-2 px-3 py-1.5 text-[0.8em] hover:bg-gray-50 cursor-pointer border-b border-gray-100 font-semibold">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={() =>
                                            setSelected(
                                                allChecked ? [] : props.dataset.map((_, i) => i)
                                            )
                                        }
                                    />
                                    <span>All Types</span>
                                </label>
                                {props.dataset.map((d, i) => (
                                    <label
                                        key={i}
                                        className="flex items-center gap-2 px-3 py-1.5 text-[0.8em] hover:bg-gray-50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(i)}
                                            onChange={() => toggleSelected(i)}
                                        />
                                        <span
                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: d.borderColor }}
                                        />
                                        <span className="truncate">{d.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div>{props.side}</div>
            </div>
        </div>
        <Line data={chartData} options={chartOptions} className="w-full h-full" />
    </div>
  );
}
export default LineGraph