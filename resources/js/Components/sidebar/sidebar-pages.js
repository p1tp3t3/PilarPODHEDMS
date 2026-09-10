import {
    LineChart,
    User,
    UserPlus,
    List,
    GraduationCap,
    FileText,
    AlertTriangle,
    Settings,
    SlidersHorizontal,
    Wrench,
    Users,
    Archive,
    Calendar,
    BarChart3,
    UserRoundCog,
} from "lucide-react"

// Single source of truth for every role's sidebar navigation. Each entry is
// visible only to the roles listed in `roles`; `show(usr)` can further narrow
// visibility (e.g. program-head-only items) beyond a simple role check.
//
// `id` must be a literal substring of the page's own URL — SidebarNav marks
// a nav item active via `url.includes(id)`. The same id is reused
// across different roles' entries on purpose (e.g. "student-list" appears
// under super_admin, sub_admin and teaching_staff); that's safe because a
// given user only ever sees their own role's items, so they never coexist
// in the DOM.
export const sidebarPages = [
    {
        type: "link", id: "dashboard", href: "/dashboard", icon: LineChart, label: "Dashboard",
        // "guard"/"guidance" aren't separate roles — they're positions
        // inside non_teaching_staff, already covered by that role entry.
        roles: ["super_admin", "sub_admin", "student", "teaching_staff", "non_teaching_staff", "parent"],
    },

    // ---- super_admin (ITRC) ----
    {
        type: "dropdown", id: "user-management", icon: User, label: "User Management", roles: ["super_admin"],
        items: [
            { id: "accounts/register", href: "/super-admin/accounts/register", icon: UserPlus, label: "New User" },
            { id: "user-accounts", href: "/super-admin/user-accounts", icon: List, label: "User List" },
            { id: "student-list", href: "/super-admin/student-list", icon: GraduationCap, label: "Students" },
            { id: "parent-request-list", href: "/super-admin/parent-request-list", icon: User, label: "Parent Request" },
        ],
    },
    { type: "link", id: "program", href: "/super-admin/program", icon: GraduationCap, label: "College Programs", roles: ["super_admin"] },
    { type: "link", id: "report", href: "/super-admin/report", icon: FileText, label: "Reports", roles: ["super_admin"] },
    { type: "link", id: "violation-management", href: "/violation-management", icon: AlertTriangle, label: "Violation Management", roles: ["super_admin"] },
    {
        type: "dropdown", id: "system-administrator", icon: Settings, label: "System Administrator", roles: ["super_admin"],
        items: [
            { id: "system-settings", href: "/system-settings", icon: SlidersHorizontal, label: "System Settings" },
            { id: "school-year", href: "/super-admin/school-year", icon: Calendar, label: "School Year" },
            { id: "maintenance", href: "/maintenance", icon: Wrench, label: "Maintenance" },
        ],
    },

    // ---- sub_admin (Prefect) ----
    {
        type: "dropdown", id: "user-list", icon: User, label: "User List", roles: ["sub_admin"],
        items: [
            { id: "student-list", href: "/prefect/student-list", icon: GraduationCap, label: "Student List" },
            { id: "staff-list", href: "/prefect/staff-list", icon: UserRoundCog, label: "Staff List" },
        ],
    },
    {
        type: "dropdown", id: "incident", icon: AlertTriangle, label: "Incident Management", roles: ["sub_admin"],
        items: [
            { id: "complaints", href: "/prefect/complaints", icon: FileText, label: "Complaints" },
            { id: "referrals", href: "/prefect/referrals", icon: FileText, label: "Referrals" },
            { id: "absent-form", href: "/prefect/absent-form", icon: FileText, label: "Absent Forms" },
            { id: "archives", href: "/prefect/archive", icon: Archive, label: "Archives" },
        ],
    },
    { type: "link", id: "violation-management", href: "/violation-management", icon: AlertTriangle, label: "Violation Management", roles: ["sub_admin"] },
    { type: "link", id: "appointment", href: "/prefect/appointment", icon: Calendar, label: "Appointment", roles: ["sub_admin"] },
    { type: "link", id: "gatepass", href: "/prefect/gatepass", icon: FileText, label: "Gate-Pass", roles: ["sub_admin"] },
    { type: "link", id: "report", href: "/prefect/report", icon: BarChart3, label: "Reports", roles: ["sub_admin"] },

    // ---- shared: complaint (student, teaching_staff, non_teaching_staff, parent) ----
    {
        type: "link", id: "complaint", href: "/complaint", icon: FileText, label: "Complaint",
        roles: ["student", "teaching_staff", "non_teaching_staff", "parent"],
    },

    // ---- student ----
    { type: "link", id: "absent-form", href: "/absent-form", icon: FileText, label: "Absent Form", roles: ["student"] },
    { type: "link", id: "gatepass", href: "/gatepass", icon: FileText, label: "Gate-Pass", roles: ["student"] },

    // ---- teaching_staff ----
    {
        type: "dropdown", id: "user-list", icon: User, label: "User List", roles: ["teaching_staff"],
        show: (usr) => usr.teaching_staff?.position === "program_head",
        items: [
            { id: "faculty-list", href: "/teaching-staff/faculty-list", icon: UserRoundCog, label: "Faculty" },
            { id: "student-list", href: "/teaching-staff/student-list", icon: GraduationCap, label: "Student" },
            { id: "account-files", href: "/teaching-staff/account-files", icon: FileText, label: "Account Files" },
        ],
    },
    {
        type: "link", id: "student-list", href: "/teaching-staff/student-list", icon: GraduationCap, label: "Student List",
        roles: ["teaching_staff"], show: (usr) => usr.teaching_staff?.position !== "program_head",
    },
    {
        type: "link", id: "referral", href: "/referral", icon: FileText, label: "Referral",
        roles: ["teaching_staff"], show: (usr) => usr.teaching_staff?.position === "program_head",
    },

    // ---- non_teaching_staff: guard/guidance positions ----
    {
        type: "link", id: "gatepass", href: "/gatepass-verification", icon: FileText, label: "Gate Pass Verification",
        roles: ["non_teaching_staff"], show: (usr) => usr.non_teaching_staff?.position === "Guard",
    },
    {
        type: "link", id: "guidance/referral", href: "/guidance/referral", icon: FileText, label: "Referrals",
        roles: ["non_teaching_staff"], show: (usr) => usr.non_teaching_staff?.position === "Guidance",
    },

    // ---- parent ----
    { type: "link", id: "monitor", href: "/children/monitor", icon: Users, label: "Children Monitoring", roles: ["parent"] },
]

export const getSidebarPages = (usr) =>
    sidebarPages.filter((item) => item.roles.includes(usr.role) && (item.show ? item.show(usr) : true))
