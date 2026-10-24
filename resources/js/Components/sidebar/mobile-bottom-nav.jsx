import { profileUrl } from "@/others/function";
import { Link, usePage } from "@inertiajs/react"
import { Paper, BottomNavigation, BottomNavigationAction, Badge, Fab } from "@mui/material"
import { Home, MessageCircle, User, Menu, DoorOpen, CalendarX, Share2, Wrench, Users, GraduationCap } from "lucide-react"
import { getSidebarPages } from "./sidebar-pages"
import { toggleSidebarDrawer } from "./sidebar-drawer"

// Each role's main page (Complaint, or New User for the super admin) is
// the raised center button; everything else is one tap away behind "Menu".
const PRIMARY_HREF = {
    sub_admin: "/prefect/complaints",
    super_admin: "/super-admin/accounts/register",
}

const primaryPageFor = (usr) => {
    const links = getSidebarPages(usr).flatMap((item) =>
        item.type === "dropdown" ? item.items.filter((sub) => sub.show ?? true) : [item]
    )
    const preferred = PRIMARY_HREF[usr.role]
    return links.find((l) => l.href === preferred)
        ?? links.find((l) => l.href !== "/dashboard")
}

const actionSx = {
    minWidth: 0,
    px: 0.5,
    color: "var(--dm-text-soft, #6b7280)",
    "&.Mui-selected": { color: "#2563eb" },
    "& .MuiBottomNavigationAction-label": { fontSize: "0.65rem", mt: 0.25, whiteSpace: "nowrap" },
    "& .MuiBottomNavigationAction-label.Mui-selected": { fontSize: "0.65rem", fontWeight: 600 },
}

const MobileBottomNav = ({ chatUnread = 0 }) => {
    const { url, props } = usePage()
    const usr = props.auth?.user
    if (!usr) return null

    const primary = primaryPageFor(usr)
    // Fourth slot: a role's second most-used page where it has one, otherwise
    // Profile (always reachable from the header's avatar menu anyway).
    const FOURTH_SLOT = {
        sub_admin: { value: "gatepass", label: "Gate Pass", icon: DoorOpen, href: "/prefect/gatepass" },
        student: { value: "absent-form", label: "Absent Form", icon: CalendarX, href: "/absent-form" },
        teaching_staff: { value: "referral", label: "Referral", icon: Share2, href: "/referral" },
        super_admin: { value: "maintenance", label: "Maintenance", icon: Wrench, href: "/maintenance" },
    }
    const fourth = FOURTH_SLOT[usr.role]
        ?? { value: "profile", label: "Profile", icon: User, href: `${profileUrl(usr)}` }
    // Teaching staff have nothing else behind "Menu", so their user list
    // (program head) / student list (faculty) takes that slot instead,
    // just before Referral.
    const isProgramHead = usr.teaching_staff?.position === "program_head"
    const listSlot = usr.role === "teaching_staff"
        ? (isProgramHead
            ? { value: "account-files", label: "User List", icon: Users, href: "/teaching-staff/account-files" }
            : { value: "student-list", label: "Student List", icon: GraduationCap, href: "/teaching-staff/student-list" })
        : null
    fourth.match = url.startsWith(fourth.value === "profile" ? "/profile" : fourth.href)
    const value =
        url.startsWith("/dashboard") ? "home"
        : url.startsWith("/chat") ? "chat"
        : primary && url.includes(primary.id) ? "primary"
        : fourth.match ? fourth.value
        : listSlot && url.startsWith(listSlot.href) ? listSlot.value
        : false

    return (
        <Paper
            elevation={8}
            square
            className="md:!hidden"
            sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 80, pb: "env(safe-area-inset-bottom)" }}
        >
            <BottomNavigation showLabels value={value} sx={{ height: 64, overflow: "visible" }}>
                <BottomNavigationAction
                    value="home"
                    label="Home"
                    icon={<Home size={21} />}
                    component={Link}
                    href="/dashboard"
                    sx={actionSx}
                />
                <BottomNavigationAction
                    value="chat"
                    label="Chat"
                    icon={
                        <Badge badgeContent={chatUnread} color="error" max={9}>
                            <MessageCircle size={21} />
                        </Badge>
                    }
                    component={Link}
                    href="/chat"
                    sx={actionSx}
                />
                {primary && (
                    <BottomNavigationAction
                        value="primary"
                        label={primary.label}
                        icon={
                            <Fab
                                component="span"
                                color="primary"
                                size="medium"
                                sx={{
                                    mt: -3.5,
                                    boxShadow: 4,
                                    border: "4px solid #fff",
                                    width: 56,
                                    height: 56,
                                    pointerEvents: "none",
                                }}
                            >
                                <primary.icon size={22} />
                            </Fab>
                        }
                        component={Link}
                        href={primary.href}
                        sx={{
                            ...actionSx,
                            justifyContent: "flex-end",
                            pb: 0.75,
                            color: "#2563eb",
                            "& .MuiBottomNavigationAction-label": { fontSize: "0.65rem", fontWeight: 600, mt: 0.25, whiteSpace: "nowrap" },
                        }}
                    />
                )}
                {listSlot && (
                    <BottomNavigationAction
                        value={listSlot.value}
                        label={listSlot.label}
                        icon={<listSlot.icon size={21} />}
                        component={Link}
                        href={listSlot.href}
                        sx={actionSx}
                    />
                )}
                <BottomNavigationAction
                    value={fourth.value}
                    label={fourth.label}
                    icon={<fourth.icon size={21} />}
                    component={Link}
                    href={fourth.href}
                    sx={actionSx}
                />
                {!listSlot && <BottomNavigationAction
                    value="menu"
                    label="Menu"
                    icon={<Menu size={21} />}
                    onClick={(e) => {
                        e.preventDefault()
                        toggleSidebarDrawer()
                    }}
                    sx={actionSx}
                />}
            </BottomNavigation>
        </Paper>
    )
}

export default MobileBottomNav
