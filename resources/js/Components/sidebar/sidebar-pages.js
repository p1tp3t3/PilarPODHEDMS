import {
    Activity,
    UserCog,
    FileText,
    LineChart,
    User,
    UserPlus,
    UserCheck,
    List,
    GraduationCap,
    FileWarning,
    Share2,
    CalendarX,
    DoorOpen,
    AlertTriangle,
    ShieldAlert,
    Settings,
    SlidersHorizontal,
    Wrench,
    Users,
    Archive,
    Calendar,
    BarChart3,
    UserRoundCog,
    ShieldCheck,
    BrainCircuit,
    Gavel,
    KeyRound,
    Clock,
    Filter,
    ScrollText,
    HeartHandshake,
    PhoneCall,
} from "lucide-react"

// Single source of truth for every role's sidebar navigation. Each entry is
// visible only to the roles listed in `roles`; `show(usr)` can further narrow
// visibility (e.g. program-head-only items) beyond a simple role check.
//
// `id` must be a literal substring of the page's own URL — SidebarNav marks
// a nav item active via `url.includes(id)`. The same id is reused
// across different roles' entries on purpose (e.g. "student-list" appears
// under super_admin, sub_admin and faculty); that's safe because a
// given user only ever sees their own role's items, so they never coexist
// in the DOM.
export const sidebarPages = [
    {
        type: "link", id: "dashboard", href: "/dashboard", icon: LineChart, label: "Dashboard",
        // "guard"/"guidance" aren't separate roles — they're positions
        // inside non_teaching_staff, already covered by that role entry.
        roles: ["super_admin", "sub_admin", "student", "program_head", "faculty", "non_teaching_staff", "parent"],
    },

    // ---- super_admin (ITRC) ----
    {
        type: "dropdown", id: "user-management", icon: User, label: "User Management", roles: ["super_admin"],
        items: [
            { id: "accounts/register", href: "/super-admin/accounts/register", icon: UserPlus, label: "New User" },
            { id: "user-accounts", href: "/super-admin/user-accounts", icon: List, label: "User List" },
            { id: "super-admin/roles", href: "/super-admin/roles", icon: ShieldCheck, label: "Roles" },
            // The list of positions (the staff themselves are in User List).
            { id: "super-admin/positions", href: "/super-admin/positions", icon: UserRoundCog, label: "Staff Positions" },
            { id: "student-list", href: "/super-admin/student-list", icon: GraduationCap, label: "Students" },
            { id: "parent-request-list", href: "/super-admin/parent-request-list", icon: UserCheck, label: "Parent Registration Requests" },
        ],
    },
    { type: "link", id: "program", href: "/super-admin/program", icon: GraduationCap, label: "College Programs", roles: ["super_admin"] },
    {
        type: "dropdown", id: "super-admin/report", icon: BarChart3, label: "Reports", roles: ["super_admin"],
        items: [
            // Report Generator first: saved report filters, generated as PDF / Excel
            // (its Generated Reports tab has its own URL).
            { id: "report/generator", href: "/super-admin/report/generator", also: ["/super-admin/report/generated"], icon: Filter, label: "Report Generator" },
            { id: "report/statistics", href: "/super-admin/report/statistics", icon: BarChart3, label: "Statistics" },
            { id: "report/action-log", href: "/super-admin/report/action-log", icon: ScrollText, label: "Action Log" },
            { id: "report/account-activity", href: "/super-admin/report/account-activity", icon: Activity, label: "Account Activity" },
            { id: "report/account-setup", href: "/super-admin/report/account-setup", icon: UserCog, label: "Account Setup" },
            { id: "report/enrollment", href: "/super-admin/report/enrollment", icon: GraduationCap, label: "Enrollment" },
        ],
    },
    {
        type: "dropdown", id: "system-administrator", icon: Settings, label: "System Administrator", roles: ["super_admin"],
        items: [
            { id: "system-settings", href: "/system-settings", icon: SlidersHorizontal, label: "System Settings" },
            { id: "school-year", href: "/super-admin/school-year", icon: Calendar, label: "School Year" },
            { id: "maintenance", href: "/maintenance", icon: Wrench, label: "Maintenance" },
            { id: "model-training", href: "/super-admin/model-training", icon: BrainCircuit, label: "Model Training" },
            { id: "security-monitor", href: "/super-admin/security-monitor", icon: ShieldAlert, label: "Security Monitor" },
        ],
    },

    // ---- sub_admin (Prefect) ----
    {
        type: "link", id: "user-list", href: "/prefect/user-list", icon: User, label: "User List", roles: ["sub_admin"],
    },
    {
        type: "dropdown", id: "incident", icon: ShieldAlert, label: "Incident Management", roles: ["sub_admin"],
        items: [
            { id: "complaints", href: "/prefect/complaints", icon: FileWarning, label: "Complaints" },
            { id: "referrals", href: "/prefect/referrals", icon: Share2, label: "Referrals" },
            { id: "absent-form", href: "/prefect/absent-form", icon: CalendarX, label: "Absent Forms" },
            { id: "archives", href: "/prefect/archive", icon: Archive, label: "Archives" },
        ],
    },
    {
        type: "dropdown", id: "violation-management", icon: AlertTriangle, label: "Violation Management", roles: ["sub_admin"],
        items: [
            { id: "violation-management/violations", href: "/violation-management/violations", icon: ShieldAlert, label: "Violations" },
            { id: "violation-management/penalties", href: "/violation-management/penalties", icon: Gavel, label: "Penalties" },
            { id: "violation-management/student-violations", href: "/violation-management/student-violations", icon: GraduationCap, label: "Student Violations" },
        ],
    },
    {
        // The calendar, the call-ins sent, and the students already
        // intervened (appointments, call-ins, referrals, complaints).
        type: "dropdown", id: "prefect/appointment-menu", icon: Calendar, label: "Appointment", roles: ["sub_admin"],
        items: [
            { id: "prefect/appointment", href: "/prefect/appointment", icon: Calendar, label: "Calendar" },
            { id: "prefect/call-ins", href: "/prefect/call-ins", icon: PhoneCall, label: "Call-In History" },
            { id: "prefect/interventions", href: "/prefect/interventions", icon: HeartHandshake, label: "Interventions" },
        ],
    },
    { type: "link", id: "prefect/gatepass", href: "/prefect/gatepass", icon: DoorOpen, label: "Gate-Pass", roles: ["sub_admin"] },
    {
        type: "dropdown", id: "prefect/report", icon: BarChart3, label: "Reports", roles: ["sub_admin"],
        items: [
            // Generated Reports is a tab of the Report Generator (also: its URL).
            { id: "report/saved-filters", href: "/prefect/report/saved-filters", also: ["/prefect/report/generated"], icon: Filter, label: "Report Generator" },
            { id: "report/incident", href: "/prefect/report/incident", icon: FileWarning, label: "Incident Report" },
            { id: "report/violation", href: "/prefect/report/violation", icon: AlertTriangle, label: "Violation Report" },
            { id: "report/tardy", href: "/prefect/report/tardy", icon: Clock, label: "Tardy Report" },
            { id: "report/appointment", href: "/prefect/report/appointment", icon: Calendar, label: "Appointment Report" },
            { id: "report/gatepass", href: "/prefect/report/gatepass", icon: DoorOpen, label: "Gate Pass Report" },
            { id: "report/analytics", href: "/prefect/report/analytics", icon: LineChart, label: "Analytical Report" },
            { id: "report/action-log", href: "/prefect/report/action-log", icon: ScrollText, label: "Action Log" },
        ],
    },

    // ---- shared: complaint (student, program_head, faculty, non_teaching_staff, parent) ----
    {
        type: "link", id: "complaint", href: "/complaint", icon: FileWarning, label: "Complaint",
        roles: ["student", "program_head", "faculty", "non_teaching_staff", "parent"],
    },

    // ---- student ----
    { type: "link", id: "absent-form", href: "/absent-form", icon: CalendarX, label: "Absent Form", roles: ["student"] },
    { type: "link", id: "gatepass", href: "/gatepass", icon: DoorOpen, label: "Gate-Pass", roles: ["student"] },

    // ---- student: appointment (the prefect schedules them) ----
    { type: "link", id: "appointment", href: "/appointment", icon: Calendar, label: "Appointment", roles: ["student"] },

    // ---- program_head / faculty ----
    // Account Files (other/program-account-files.jsx) already shows Faculty
    // and Student as tabs on the same page — separate "Faculty"/"Student"
    // dropdown entries just linked to duplicate, single-purpose versions of
    // those same tabs, so this is one link instead of a three-item dropdown.
    {
        type: "link", id: "account-files", href: "/program/account-files", icon: Users, label: "User List",
        roles: ["program_head"],
    },
    {
        type: "link", id: "student-list", href: "/program/student-list", icon: GraduationCap, label: "Student List",
        roles: ["faculty"],
    },
    {
        type: "link", id: "referral", href: "/referral", icon: Share2, label: "Referral",
        roles: ["program_head", "faculty"],
    },

    // ---- non_teaching_staff: guard/guidance positions ----
    {
        type: "link", id: "gatepass", href: "/gatepass-verification", icon: DoorOpen, label: "Gate Pass Verification",
        roles: ["non_teaching_staff"], show: (usr) => usr.non_teaching_staff?.position === "Guard",
    },
    {
        type: "link", id: "guidance/referral", href: "/guidance/referral", icon: Share2, label: "Referrals",
        // The offices referrals are sent on to: Guidance and IT Staff.
        roles: ["non_teaching_staff"], show: (usr) => ["Guidance", "IT Staff"].includes(usr.non_teaching_staff?.position),
    },

    // ---- parent ----
    { type: "link", id: "monitor", href: "/children/monitor", icon: Users, label: "Children Monitoring", roles: ["parent"] },
]

export const getSidebarPages = (usr) =>
    sidebarPages.filter((item) => item.roles.includes(usr.role) && (item.show ? item.show(usr) : true))
