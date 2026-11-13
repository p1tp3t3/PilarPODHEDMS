import { useEffect, useRef, useState } from "react"
import { router, usePage } from "@inertiajs/react"
import axios from "axios"
import { Wrench } from "lucide-react"

// In the page title bar (every page) while maintenance is scheduled: a live
// countdown to when it starts; a click shows the exact date and time. Starts
// from the shared `maintenance_mode_scheduled_at` prop, then follows changes
// in real time: the MaintenanceScheduleChanged broadcast, or a check every
// 30 seconds when live updates (Reverb) aren't running.

const pad = (n) => String(n).padStart(2, "0")

const remaining = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    const d = Math.floor(s / 86400)
    const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
    return d > 0 ? `${d}d ${hms}` : hms
}

const MaintenanceCountdown = () => {
    const initial = usePage().props.maintenance_mode_scheduled_at
    const [scheduledAt, setScheduledAt] = useState(initial ?? null)
    const start = scheduledAt ? new Date(scheduledAt).getTime() : null
    const [now, setNow] = useState(Date.now())
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const reloaded = useRef(false)

    // A new page brings the current value.
    useEffect(() => { setScheduledAt(initial ?? null) }, [initial])

    // Live: scheduled / cancelled by the IT admin.
    useEffect(() => {
        const channel = window.Echo?.channel("maintenance")
        channel?.listen("MaintenanceScheduleChanged", (e) => {
            setScheduledAt(e?.scheduled_at ?? null)
            reloaded.current = false
        })
        return () => channel?.stopListening("MaintenanceScheduleChanged")
    }, [])

    // Fallback when live updates aren't running: check every 30 seconds.
    useEffect(() => {
        const check = () => {
            if (document.visibilityState !== "visible") return
            axios.get("/maintenance-schedule")
                .then((r) => setScheduledAt(r.data?.scheduled_at ?? null))
                .catch(() => {})
        }
        const t = setInterval(check, 30_000)
        document.addEventListener("visibilitychange", check)
        return () => { clearInterval(t); document.removeEventListener("visibilitychange", check) }
    }, [])

    useEffect(() => {
        if (!start) return
        const t = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(t)
    }, [start])

    // At zero, reload: maintenance mode takes over (and the schedule clears).
    useEffect(() => {
        if (start && now >= start && !reloaded.current) {
            reloaded.current = true
            setTimeout(() => router.reload(), 1500)
        }
    }, [start, now])

    useEffect(() => {
        if (!open) return
        const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
        document.addEventListener("click", close)
        return () => document.removeEventListener("click", close)
    }, [open])

    if (!start || Number.isNaN(start)) return null

    const left = start - now
    const when = new Date(start).toLocaleString("en-US", {
        timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    })

    return (
        <div ref={ref} className="relative flex-shrink-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                title="Scheduled maintenance"
                className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[0.8em] font-semibold text-amber-900 hover:bg-amber-100 normal-case tracking-normal"
            >
                <Wrench size={14} className="text-amber-600" />
                <span className="hidden sm:inline">{left > 0 ? "Maintenance in" : "Maintenance starting"}</span>
                {left > 0 && <span className="font-mono tabular-nums">{remaining(left)}</span>}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 z-[120] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-amber-200 bg-white p-4 shadow-lg text-left normal-case tracking-normal">
                    <div className="flex items-center gap-2 font-semibold text-gray-800 text-[0.9em]">
                        <Wrench size={15} className="text-amber-600" /> Scheduled Maintenance
                    </div>
                    <p className="mt-2 text-[0.85em] text-gray-600 font-normal">
                        Starts on <b className="text-gray-800">{when}</b> (Manila time). The system will be
                        temporarily unavailable from then.
                    </p>
                    {left > 0 && (
                        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-center">
                            <div className="text-[0.75em] text-amber-800 font-normal">Time left</div>
                            <div className="font-mono tabular-nums text-[1.1em] font-bold text-amber-900">{remaining(left)}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default MaintenanceCountdown
