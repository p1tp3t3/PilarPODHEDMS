import { getProfilePic, profileUrl } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import { Link, router } from "@inertiajs/react"
import { motion, AnimatePresence } from "framer-motion"
import { Switch } from "@mui/material"
import { User, Settings, LogOut, ChevronRight, History } from "lucide-react"

const roleLabel = (identity) => {
    switch (identity?.role) {
        case "super_admin": return "IT Admin"
        case "sub_admin": return "Prefect"
        case "student": return "Student"
        case "teaching_staff": return identity.teaching_staff?.position === "program_head" ? "Program Head" : "Faculty"
        case "non_teaching_staff": return identity.non_teaching_staff?.position || "Staff"
        case "parent": return "Parent"
        default: return null
    }
}

const MenuLink = ({ href, icon: Icon, children }) => (
    <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.85em] text-gray-700 hover:bg-gray-100"
    >
        <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-white grid place-items-center text-gray-600">
            <Icon size={16} />
        </span>
        <span className="flex-1 font-medium">{children}</span>
        <ChevronRight size={15} className="text-gray-400" />
    </Link>
)

// Header actions (call in, active users, full screen, dark mode) are listed
// in this menu instead of as header buttons.
const MenuAction = ({ icon: Icon, label, onClick, badge, toggled, className = "flex" }) => (
    <button
        type="button"
        onClick={onClick}
        className={`group ${className} w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.85em] text-gray-700 hover:bg-gray-100 text-left`}
    >
        <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-white grid place-items-center text-gray-600">
            <Icon size={16} />
        </span>
        <span className="flex-1 font-medium">{label}</span>
        {/* The whole row is the click target; the switch just shows the state. */}
        {toggled !== undefined && (
            <Switch size="small" checked={toggled} tabIndex={-1} inputProps={{ "aria-hidden": true }} sx={{ pointerEvents: "none", my: -1 }} />
        )}
        {badge != null && badge > 0 && (
            <span className="min-w-[1.3rem] h-[1.3rem] px-1 rounded-full bg-green-600 text-white text-[0.75em] font-semibold grid place-items-center">
                {badge > 99 ? "99+" : badge}
            </span>
        )}
    </button>
)

const AccountModal = (props) => {
    const user = props.user,
          identity = props.identity ?? user
    const fullName = `${identity.profile?.first_name ?? ''} ${identity.profile?.last_name ?? ''}`.trim() || user.username
    const role = roleLabel(identity)

    return (
        <AnimatePresence>
        {props.click &&
        <motion.div
            ref={props.refs}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 right-0 mt-[2.8rem] w-full sm:w-[18rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
            <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100">
                <ProfilePic src={getProfilePic(identity.profile?.profile_picture, identity.profile?.sex)} size={3.2} />
                <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{fullName}</p>
                    {role && (
                        <span className="inline-block mt-1 rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[0.65em] font-semibold">
                            {role}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-2">
                <MenuLink href={`${profileUrl(user)}`} icon={User}>See Profile</MenuLink>
                <MenuLink href={'/settings/' + user.username} icon={Settings}>Account Settings</MenuLink>
                <MenuLink href="/my-activity" icon={History}>My Activity</MenuLink>
            </div>

            {props.actions?.length > 0 && (
                <div className="p-2 border-t border-gray-100">
                    {props.actions.map((a) => <MenuAction key={a.key ?? a.label} {...a} />)}
                </div>
            )}

            <div className="border-t border-gray-100 p-2">
                <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.85em] font-medium text-red-600 hover:bg-red-50"
                    onClick={() => {
                        localStorage.removeItem('is-unresolved-complaint-modal-clicked');
                        router.visit('/log-out');
                    }}
                >
                    <span className="w-8 h-8 rounded-full bg-red-50 grid place-items-center">
                        <LogOut size={16} />
                    </span>
                    Log Out
                </button>
            </div>
        </motion.div>
        }
        </AnimatePresence>
    )
}
export default AccountModal
