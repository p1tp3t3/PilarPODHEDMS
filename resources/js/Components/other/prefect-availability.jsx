import { useEffect, useMemo, useState } from "react"
import { Clock, ChevronDown, Plus, Trash2, CalendarClock } from "lucide-react"
import FormButton from "@/Components/button/button"
import { showOutputModal } from "@/others/function"

// The prefect's weekly availability (Mon–Sat), set in the prefect's Account
// Settings and shown to every user on their dashboard.
// Backend: PrefectAvailabilityController (GET/POST /prefect-availability).

export const DAYS = [
    { n: 1, short: "Mon", label: "Monday" },
    { n: 2, short: "Tue", label: "Tuesday" },
    { n: 3, short: "Wed", label: "Wednesday" },
    { n: 4, short: "Thu", label: "Thursday" },
    { n: 5, short: "Fri", label: "Friday" },
    { n: 6, short: "Sat", label: "Saturday" },
]

// "14:30" → "2:30 PM"
export const formatTime = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number)
    const suffix = h >= 12 ? "PM" : "AM"
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`
}
const formatRange = (s) => `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`

// Current weekday (1 = Mon … 7 = Sun) and "HH:MM", in Manila time.
const manilaNow = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date())
    const get = (t) => parts.find((p) => p.type === t)?.value
    const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1
    return { day, time: `${get("hour")}:${get("minute")}` }
}

const fetchAvailability = () => window.axios.get("/prefect-availability").then((r) => r.data.prefects ?? [])

// ---------------------------------------------------------------------------
// Dashboard card (every role)
// ---------------------------------------------------------------------------
export const PrefectAvailabilityCard = () => {
    const [prefects, setPrefects] = useState(null)
    const [open, setOpen] = useState(false)
    const [now, setNow] = useState(manilaNow)

    useEffect(() => {
        fetchAvailability().then(setPrefects).catch(() => setPrefects([]))
        const t = setInterval(() => setNow(manilaNow()), 60_000)
        return () => clearInterval(t)
    }, [])

    if (prefects === null) {
        return <div className="w-full h-[4.5rem] rounded-lg bg-white border border-gray-200 animate-pulse" />
    }

    const many = prefects.length > 1

    return (
        <div className="w-full rounded-lg bg-white border border-gray-200 shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
                <span className="w-9 h-9 shrink-0 rounded-full bg-blue-50 text-blue-700 grid place-items-center">
                    <CalendarClock size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-800 text-[0.95em]">Prefect Availability</span>
                        {prefects.length > 0 && <NowBadge prefects={prefects} now={now} />}
                    </div>
                    <TodaySummary prefects={prefects} now={now} />
                </div>
                <span className="shrink-0 flex items-center gap-1 text-[0.8em] font-medium text-blue-700">
                    <span className="hidden sm:inline">{open ? "Hide week" : "View week"}</span>
                    <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </span>
            </button>

            {open && (
                <div className="border-t border-gray-100 px-4 py-3 grid gap-4">
                    {prefects.length === 0 && (
                        <p className="text-[0.85em] text-gray-500">No prefect account yet.</p>
                    )}
                    {prefects.map((p) => (
                        <div key={p.id} className="grid gap-2">
                            {many && <p className="text-[0.85em] font-semibold text-gray-700">{p.name}</p>}
                            <WeekTable slots={p.slots} today={now.day} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const isAvailableNow = (slots, now) =>
    slots.some((s) => s.day_of_week === now.day && s.start_time <= now.time && now.time < s.end_time)

const NowBadge = ({ prefects, now }) => {
    const available = prefects.some((p) => isAvailableNow(p.slots, now))
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7em] font-semibold ${available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${available ? "bg-green-600" : "bg-gray-400"}`} />
            {available ? "Available now" : "Not available now"}
        </span>
    )
}

const TodaySummary = ({ prefects, now }) => {
    if (prefects.length === 0 || prefects.every((p) => p.slots.length === 0)) {
        return <p className="text-[0.8em] text-gray-500 mt-0.5">The prefect hasn't set an availability schedule yet.</p>
    }
    if (now.day === 7) {
        return <p className="text-[0.8em] text-gray-500 mt-0.5">Not available on Sundays.</p>
    }
    const today = prefects.flatMap((p) => p.slots.filter((s) => s.day_of_week === now.day))
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    return (
        <p className="text-[0.8em] text-gray-600 mt-0.5 truncate">
            <span className="font-medium">Today:</span>{" "}
            {today.length ? today.map(formatRange).join(", ") : "Not available"}
        </p>
    )
}

const WeekTable = ({ slots, today }) => (
    <div className="grid gap-1.5">
        {DAYS.map((d) => {
            const daySlots = slots.filter((s) => s.day_of_week === d.n)
            const isToday = d.n === today
            return (
                <div key={d.n} className={`flex items-start gap-3 rounded-md px-3 py-2 ${isToday ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}>
                    <span className={`w-20 shrink-0 text-[0.85em] font-semibold ${isToday ? "text-blue-800" : "text-gray-700"}`}>
                        {d.label}{isToday && <span className="block text-[0.75em] font-medium text-blue-700">Today</span>}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {daySlots.length
                            ? daySlots.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[0.8em] text-gray-700">
                                    <Clock size={12} className="text-gray-400" /> {formatRange(s)}
                                </span>
                            ))
                            : <span className="text-[0.8em] text-gray-400 py-0.5">Not available</span>}
                    </div>
                </div>
            )
        })}
    </div>
)

// ---------------------------------------------------------------------------
// Editor (prefect's own Account Settings)
// ---------------------------------------------------------------------------
const MAX_PER_DAY = 6

// Same rules as the server: end after start, no overlaps on a day.
const validateDay = (ranges) => {
    for (const r of ranges) {
        if (!r.start_time || !r.end_time) return "Set both a start and an end time."
        if (r.end_time <= r.start_time) return "The end time must be later than the start time."
    }
    const sorted = [...ranges].sort((a, b) => a.start_time.localeCompare(b.start_time))
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start_time < sorted[i - 1].end_time) return "Time ranges must not overlap."
    }
    return null
}

export const AvailabilityScheduleEditor = ({ userId, reload }) => {
    const [week, setWeek] = useState(null) // { 1: [{start_time, end_time}], ... }
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)

    const toWeek = (slots) => Object.fromEntries(DAYS.map((d) => [d.n, slots.filter((s) => s.day_of_week === d.n).map(({ start_time, end_time }) => ({ start_time, end_time }))]))

    useEffect(() => {
        fetchAvailability()
            .then((list) => setWeek(toWeek(list.find((p) => p.id === userId)?.slots ?? [])))
            .catch(() => setWeek(toWeek([])))
    }, [userId])

    const setDay = (n, ranges) => {
        setWeek((w) => ({ ...w, [n]: ranges }))
        setErrors((e) => ({ ...e, [n]: undefined }))
    }
    const addRange = (n) => {
        const ranges = week[n]
        const last = ranges[ranges.length - 1]
        // Start right after the previous range, else 8:00 AM, one hour long.
        const start = last?.end_time || "08:00"
        const [h, m] = start.split(":").map(Number)
        const end = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(h + 1 > 23 ? 59 : m).padStart(2, "0")}`
        setDay(n, [...ranges, { start_time: start, end_time: end }])
    }
    const copyToAll = (n) => {
        setWeek((w) => Object.fromEntries(DAYS.map((d) => [d.n, w[n].map((r) => ({ ...r }))])))
        setErrors({})
    }

    const totalRanges = useMemo(() => (week ? Object.values(week).reduce((a, r) => a + r.length, 0) : 0), [week])

    const save = () => {
        const found = {}
        DAYS.forEach((d) => { const msg = validateDay(week[d.n]); if (msg) found[d.n] = msg })
        setErrors(found)
        if (Object.keys(found).length) return

        const slots = DAYS.flatMap((d) => week[d.n].map((r) => ({ day_of_week: d.n, ...r })))
        setSaving(true)
        reload?.(true, "text-wait", "Saving availability schedule...")
        window.axios.post("/prefect-availability", { slots })
            .then(() => {
                reload?.(true, "")
                showOutputModal("Availability Schedule Saved", "s", () => reload?.(false))
            })
            .catch((e) => {
                reload?.(true, "")
                const msg = e?.response?.data?.message || "Failed to save the availability schedule."
                showOutputModal(msg, "e", () => reload?.(false))
            })
            .finally(() => setSaving(false))
    }

    return (
        <div className="bg-white px-5 md:px-10 py-8 rounded-lg shadow-sm shadow-black/20">
            <div className="flex items-start gap-3 mb-5">                
                <div>
                    <h2 className="text-lg font-semibold">Availability Schedule</h2>
                </div>
            </div>

            {week === null ? (
                <div className="h-40 rounded-md bg-gray-100 animate-pulse" />
            ) : (
                <div className="grid gap-3">
                    {DAYS.map((d) => (
                        <div key={d.n} className="rounded-lg border border-gray-200 px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-[0.9em] text-gray-800">{d.label}</span>
                                <div className="flex items-center gap-3 text-[0.8em]">
                                    {week[d.n].length > 0 && (
                                        <button type="button" onClick={() => copyToAll(d.n)} className="text-gray-500 hover:text-gray-800">
                                            Copy to all days
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => addRange(d.n)}
                                        disabled={week[d.n].length >= MAX_PER_DAY}
                                        className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900 disabled:opacity-40"
                                    >
                                        <Plus size={14} /> Add time
                                    </button>
                                </div>
                            </div>

                            {week[d.n].length === 0 ? (
                                <p className="text-[0.8em] text-gray-400 mt-1">Not available</p>
                            ) : (
                                <div className="grid gap-2 mt-2">
                                    {week[d.n].map((r, i) => (
                                        <div key={i} className="flex flex-wrap items-center gap-2">
                                            <input
                                                type="time"
                                                aria-label={`${d.label} start time`}
                                                value={r.start_time}
                                                onChange={(e) => setDay(d.n, week[d.n].map((x, k) => (k === i ? { ...x, start_time: e.target.value } : x)))}
                                                className="border border-gray-300 rounded-md px-2 py-1.5 text-[0.85em]"
                                            />
                                            <span className="text-gray-400 text-[0.85em]">to</span>
                                            <input
                                                type="time"
                                                aria-label={`${d.label} end time`}
                                                value={r.end_time}
                                                onChange={(e) => setDay(d.n, week[d.n].map((x, k) => (k === i ? { ...x, end_time: e.target.value } : x)))}
                                                className="border border-gray-300 rounded-md px-2 py-1.5 text-[0.85em]"
                                            />
                                            <button
                                                type="button"
                                                title="Remove"
                                                aria-label={`Remove ${d.label} time range`}
                                                onClick={() => setDay(d.n, week[d.n].filter((_, k) => k !== i))}
                                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errors[d.n] && <p className="text-[#d12323] text-[13px] font-[600] mt-1.5">{errors[d.n]}</p>}
                        </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <span className="text-[0.8em] text-gray-500">
                            {totalRanges === 0 ? "No times set — you'll show as not available." : `${totalRanges} time range${totalRanges === 1 ? "" : "s"} this week. Sunday is always off.`}
                        </span>
                        <FormButton type="button" label="Save Schedule" click={save} loading={saving} />
                    </div>
                </div>
            )}
        </div>
    )
}
