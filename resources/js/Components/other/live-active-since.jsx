import { useContext, useEffect, useState } from "react"
import AuthContext from "@/context-provider/auth-provider"
import { readableActiveDuration, readableDate, readableTime } from "@/others/function"

// "Active Since" cell for the user lists, driven by the Reverb presence
// channel: "Online now" while the user is connected, otherwise how long ago
// they were last active — counted from the moment they left if that
// happened while this page was open.
const LiveActiveSince = ({ userId, lastSeen, withDate = false, className = "text-[0.8em]" }) => {
    const { isUserOnline, lastSeenOf } = useContext(AuthContext)
    const [, tick] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => tick((n) => n + 1), 30000)
        return () => clearInterval(interval)
    }, [])

    if (isUserOnline?.(userId)) {
        return (
            <span className={`${className} inline-flex items-center gap-1.5 font-semibold text-green-600`}>
                <span className="h-2 w-2 rounded-full bg-green-500" /> Online now
            </span>
        )
    }

    const seen = lastSeenOf ? lastSeenOf(userId, lastSeen) : lastSeen
    if (!seen) return <span className={className}>N/A</span>

    return (
        <span className={className}>
            {readableActiveDuration(seen)}
            {withDate && ` • ${readableDate(seen)} (${readableTime(seen)})`}
        </span>
    )
}

export default LiveActiveSince
