import { useContext, useMemo, useState } from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Search, UsersRound } from "lucide-react"
import AuthContext from "@/context-provider/auth-provider"
import ProfilePic from "../other/profile-pic"
import { MenuItem, Select } from "@mui/material"
import { getProfilePic, toTitleCase, profileUrl } from "@/others/function"

// Same scope as the dashboard's Active Users widget: both admins see
// everyone (and can filter by role in the panel).
const ROLE_SCOPE = {
    super_admin: null,
    sub_admin: null,
}

const ROLE_LABEL = {
    super_admin: "IT Admin",
    sub_admin: "Prefect",
    student: "Student",
    teaching_staff: "Teaching Staff",
    non_teaching_staff: "Non-Teaching Staff",
    parent: "Parent",
}

export const canSeeActiveUsers = (role) => role in ROLE_SCOPE

// Live list straight from the Reverb presence channel (AuthContext) —
// joins/leaves update it instantly on whatever page the admin is on.
export const useActiveUsers = () => {
    const { usr, onlineUsers } = useContext(AuthContext)
    return useMemo(() => {
        const scope = ROLE_SCOPE[usr?.role]
        return (onlineUsers ?? [])
            .filter((u) => u.id !== usr?.id && (!scope || scope.includes(u.role)))
            .sort((a, b) => (b.online_since ?? 0) - (a.online_since ?? 0))
    }, [onlineUsers, usr?.id, usr?.role])
}

const sinceLabel = (ms) => {
    const mins = Math.floor((Date.now() - ms) / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h`
}

const ActiveUsersModal = ({ click, refs }) => {
    const users = useActiveUsers()
    const [search, setSearch] = useState("")
    const [role, setRole] = useState("all")

    if (!click) return null

    const q = search.trim().toLowerCase()
    const shown = users.filter((u) =>
        (role === "all" || u.role === role) &&
        (!q || `${u.name ?? ""} ${u.id_number ?? ""}`.toLowerCase().includes(q))
    )

    return (
        <motion.div
            ref={refs}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 right-0 mt-[2.8rem] w-full sm:w-[22rem] max-md:max-h-[calc(100dvh-9rem)] flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-xl bg-white"
        >
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                <h1 className="text-[1.1em] font-bold text-gray-900">Active Users</h1>
                <span className="ml-auto rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[0.7em] font-semibold">
                    {users.length} online
                </span>
            </div>

            <div className="px-4 pb-2 grid gap-2">
                {/* Menu kept inside the panel (disablePortal) so picking an
                    option doesn't count as a click outside and close it. */}
                <Select
                    size="small"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    MenuProps={{ disablePortal: true }}
                    sx={{ borderRadius: "8px", fontSize: "0.8em" }}
                >
                    <MenuItem value="all" sx={{ fontSize: "0.85em" }}>All Roles</MenuItem>
                    {Object.entries(ROLE_LABEL).map(([val, label]) => (
                        <MenuItem key={val} value={val} sx={{ fontSize: "0.85em" }}>{label}</MenuItem>
                    ))}
                </Select>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or ID..."
                        className="w-full rounded-full border border-gray-300 bg-gray-50 pl-8 pr-3 py-1.5 text-[0.8em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 max-h-[22rem] overflow-y-auto px-2 pb-2">
                {shown.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="mb-3 w-14 h-14 rounded-full bg-gray-100 grid place-items-center text-gray-400">
                            <UsersRound size={26} />
                        </div>
                        <p className="text-[0.95em] font-semibold text-gray-600">
                            {q ? "No matching users" : "No one else is online"}
                        </p>
                        <p className="text-[0.8em] text-gray-400 mt-1">People appear here the moment they log in.</p>
                    </div>
                ) : (
                    shown.map((u) => (
                        <Link
                            key={u.id}
                            href={`${profileUrl(u)}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
                        >
                            <ProfilePic
                                src={getProfilePic(u.profile_picture, u.sex)}
                                size={2.3}
                                showActive={true}
                                isActive={true}
                                activeSize={0.6}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-[0.85em] font-semibold text-gray-900 truncate">{toTitleCase(u.name ?? "User")}</p>
                                <p className="text-[0.7em] text-gray-500 truncate">
                                    {ROLE_LABEL[u.role] ?? toTitleCase(u.role ?? "")}{u.id_number ? ` · ${u.id_number.toUpperCase()}` : ""}
                                </p>
                            </div>
                            <span className="shrink-0 text-[0.7em] text-green-600 font-medium">{sinceLabel(u.online_since)}</span>
                        </Link>
                    ))
                )}
            </div>
        </motion.div>
    )
}

export default ActiveUsersModal
