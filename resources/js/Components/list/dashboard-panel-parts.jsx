import { AlertCircle } from "lucide-react"
import ProfilePic from "../other/profile-pic"
import ListSkeleton from "../reload/list-skeleton"
import { getProfilePic } from "@/others/function"

// Shared layout for the prefect dashboard's tabbed panel (New Students,
// Scheduled Appointments, Notifications): a header, then a list that fills
// the remaining panel height and scrolls inside it.

export const PanelHeader = ({ title, subtitle, children }) => (
    <div className="px-4 sm:px-5 pt-3 pb-2 grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <h2 className="font-bold text-[0.95em] text-gray-900">{title}</h2>
            {subtitle && <span className="text-[0.72em] text-gray-500">{subtitle}</span>}
        </div>
        {children}
    </div>
)

export const PanelBody = ({ list, empty, children }) => (
    <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 pb-2">
        {list == null ? (
            <div className="px-2 py-3"><ListSkeleton rows={4} /></div>
        ) : list.length === 0 ? (
            <div className="h-full min-h-[10rem] grid place-items-center text-gray-500">
                <div className="grid place-items-center gap-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 grid place-items-center text-gray-400">
                        <AlertCircle size={24} />
                    </div>
                    <div className="text-[0.85em] font-medium">{empty}</div>
                </div>
            </div>
        ) : (
            children
        )}
    </div>
)

export const PersonRow = ({ user, sub, right, footer }) => (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
        <ProfilePic size={2.3} src={getProfilePic(user?.profile?.profile_picture, user?.profile?.sex)} />
        <div className="min-w-0 flex-1">
            <div className="text-[0.85em] font-semibold text-gray-900 truncate">
                {`${user?.profile?.first_name ?? ""} ${user?.profile?.last_name ?? ""}`.trim() || user?.username}
            </div>
            <div className="text-[0.72em] text-gray-500 truncate">{sub}</div>
            {footer}
        </div>
        {right && <div className="shrink-0 flex flex-col items-end gap-1 text-right">{right}</div>}
    </div>
)

// Case-insensitive match on a user's full name, username or ID number.
export const matchesPerson = (user, query) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const p = user?.profile ?? {}
    return `${p.first_name ?? ""} ${p.middle_name ?? ""} ${p.last_name ?? ""} ${user?.username ?? ""} ${user?.id_number ?? ""}`
        .toLowerCase()
        .includes(q)
}
