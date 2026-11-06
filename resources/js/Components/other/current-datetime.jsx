import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { InfoSegment } from "./info-segment"

// Ticks on the client — deliberately not server-driven (no
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

    const dateStr = now.toLocaleDateString("en-US", {
        timeZone: DISPLAY_TIMEZONE,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    })
    const timeStr = now.toLocaleTimeString("en-US", {
        timeZone: DISPLAY_TIMEZONE,
        hour: "numeric",
        minute: "2-digit",
    })

    return (
        <InfoSegment
            icon={<Clock size={17} />}
            title={dateStr}
            subtitle={`${timeStr} · Manila time`}
        />
    )
}

export default CurrentDateTime
