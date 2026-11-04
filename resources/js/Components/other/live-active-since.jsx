import { useContext } from "react"
import AuthContext from "@/context-provider/auth-provider"
import { readableDate, readableTime } from "@/others/function"

// "Active Since" cell for the user lists: the date and time the user was
// last active. If they left while this page was open, that moment (from the
// Reverb presence channel) is used instead of the stored last_seen.
const LiveActiveSince = ({ userId, lastSeen, className = "text-[0.8rem]", align = "left" }) => {
    const { lastSeenOf } = useContext(AuthContext)
    const seen = lastSeenOf ? lastSeenOf(userId, lastSeen) : lastSeen

    if (!seen) return <span className={className}>N/A</span>

    return (
        <div className={align === "right" ? "text-right" : ""}>
            <div className={className}>{readableDate(seen)}</div>
            <div className="text-[0.7em]">{readableTime(seen)}</div>
        </div>
    )
}

export default LiveActiveSince
