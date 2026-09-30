import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

// Ticks every second on the client — deliberately not server-driven (no
// prop/shared-inertia-data), since a dashboard left open for a while should
// keep showing the real current time, not the moment the page first loaded.
// The timezone is hardcoded to Asia/Manila (matching config/app.php's
// timezone and the Asia/Manila-scheduled console commands) rather than left
// to the browser/OS's own local timezone — a visitor's machine (or a VM
// defaulting to UTC) has no reason to be set to the school's timezone, and
// this display should always reflect Manila time regardless.
const DISPLAY_TIMEZONE = "Asia/Manila"

const CurrentDateTime = () => {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const dateStr = now.toLocaleDateString(undefined, {
        timeZone: DISPLAY_TIMEZONE,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    })
    const timeStr = now.toLocaleTimeString(undefined, {
        timeZone: DISPLAY_TIMEZONE,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    })

    return (
        <div className="w-full flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-4 py-3 mb-6">
            <Clock className="text-gray-500 flex-shrink-0" size={20} />
            <p className="text-[0.85em] text-gray-700">
                <span className="font-semibold">{dateStr}</span>
                <span className="text-gray-500"> &middot; {timeStr} (Manila Time)</span>
            </p>
        </div>
    )
}

export default CurrentDateTime
