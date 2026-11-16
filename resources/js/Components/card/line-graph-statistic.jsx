import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement, Filler } from "chart.js";
import { ChevronDown } from "lucide-react";
import { Button, Checkbox, Divider, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";

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
  // The type filter menu (MUI Menu: placed on screen by MUI, never clipped
  // by the card).
  const [menuAnchor, setMenuAnchor] = useState(null)

  // Re-sync to "everything checked" whenever the set of types itself
  // changes (e.g. a date filter produces a different list of types) —
  // otherwise stale indices from the old list would linger in `selected`.
  const typeKey = props.dataset.map((d) => d.label).join("|")
  useEffect(() => {
    setSelected(props.dataset.map((_, i) => i))
  }, [typeKey])

  const toggleSelected = (idx) => {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  const allChecked = selected.length === props.dataset.length

  // Pages re-render often (live clocks, presence), handing in fresh but
  // identical arrays each time. Keying the chart on the data's contents
  // keeps Chart.js from restarting its draw animation on every render.
  const dataKey = JSON.stringify([labels, props.dataset.map((d) => [d.label, d.data, d.borderColor, d.backgroundColor])])

  const chartData = useMemo(() => ({
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
  }), [dataKey, selected, allChecked])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      // Off by default (the type picker doubles as the key); pages that
      // want the series named on the chart pass showLegend.
      legend: {
        display: !!props.showLegend,
        position: "top",
        labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true },
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
  }), [selected, props.showLegend, props.xTitle, props.yTitle])

  return (
    <div className={`${props.w} h-full flex flex-col px-4 py-3 ${props.bg} ${props.withBorder ? 'border rounded-md shadow-md shadow-black/20 border-gray-300' : ''}`}>
        <div className="text-[1.1em] flex flex-wrap justify-between items-center gap-2">
            <h1><b>{props.title}</b></h1>
            <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
                {props.dataset.length > 1 && (
                    <div>
                        <Button
                            variant="outlined"
                            size="small"
                            color="inherit"
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                            endIcon={<ChevronDown size={14} />}
                            sx={{ textTransform: "none", fontSize: "0.8em", borderColor: "divider", fontWeight: 500 }}
                        >
                            {allChecked ? (props.allLabel ?? "All Types") : `${selected.length} Selected`}
                        </Button>
                        <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={() => setMenuAnchor(null)}
                            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                            transformOrigin={{ vertical: "top", horizontal: "left" }}
                            slotProps={{ paper: { sx: { width: 300, maxWidth: "calc(100vw - 32px)", maxHeight: 320 } } }}
                        >
                            <MenuItem
                                dense
                                onClick={() => setSelected(allChecked ? [] : props.dataset.map((_, i) => i))}
                            >
                                <ListItemIcon><Checkbox size="small" sx={{ p: 0 }} checked={allChecked} /></ListItemIcon>
                                <ListItemText primary={props.allLabel ?? "All Types"} slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "0.85rem" } } }} />
                            </MenuItem>
                            <Divider />
                            {props.dataset.map((d, i) => (
                                <MenuItem key={i} dense onClick={() => toggleSelected(i)} title={d.label}>
                                    <ListItemIcon><Checkbox size="small" sx={{ p: 0 }} checked={selected.includes(i)} /></ListItemIcon>
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mr-2" style={{ backgroundColor: d.borderColor }} />
                                    <ListItemText primary={d.label} slotProps={{ primary: { noWrap: true, sx: { fontSize: "0.85rem" } } }} />
                                </MenuItem>
                            ))}
                        </Menu>
                    </div>
                )}
                <div className="max-sm:w-full">{props.side}</div>
            </div>
        </div>
        {/* Chart takes only the space left under the header, so the axis
            titles aren't pushed out of a fixed-height card. */}
        <div className="flex-1 min-h-0 relative">
            <Line data={chartData} options={chartOptions} className="w-full h-full" />
        </div>
    </div>
  );
}
export default LineGraph