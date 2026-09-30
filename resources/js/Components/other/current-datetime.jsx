import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

// Ticks every second on the client — deliberately not server-driven (no
// prop/shared-inertia-data), since a dashboard left open for a while should
// keep showing the real current time, not the moment the page first loaded.
const CurrentDateTime = () => {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const dateStr = now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    })
    const timeStr = now.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    })

    return (
        <div className="w-full flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-4 py-3 mb-6">
            <Clock className="text-gray-500 flex-shrink-0" size={20} />
            <p className="text-[0.85em] text-gray-700">
                <span className="font-semibold">{dateStr}</span>
                <span className="text-gray-500"> &middot; {timeStr}</span>
            </p>
        </div>
    )
}

export default CurrentDateTime
