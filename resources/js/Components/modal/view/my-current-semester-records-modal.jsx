import UpModal from "../up-modal"
import TabSwitcher from "@/Components/other/tab-switcher"
import { DashboardService } from "@/others/services/dashboard-service"
import { readableDate, readableTime, toTitleCase, formatSchoolYearSemester } from "@/others/function"
import { Link, usePage } from "@inertiajs/react"
import { useEffect, useState } from "react"
import { FileText, Send, CalendarX, DoorOpen, CalendarClock } from "lucide-react"

// Every type's page can auto-open a specific record's view from a
// `?view=<id>` query param, so every row here is clickable.
const TAB_META = {
    complaint: { label: "Complaints", icon: FileText, number: "complaint_number", status: "complaint_status", route: "/complaint" },
    referral: { label: "Referrals", icon: Send, number: "referral_number", status: "referral_status", route: "/referral" },
    absent_form: { label: "Absent Forms", icon: CalendarX, number: "form_number", route: "/absent-form" },
    gate_pass: { label: "Gate Passes", icon: DoorOpen, number: "gatepass_number", route: "/gatepass" },
    appointment: { label: "Appointments", icon: CalendarClock, number: null, route: "/appointment" },
}

const STATUS_STYLES = {
    pending: "bg-yellow-100 text-yellow-700",
    ongoing: "bg-orange-100 text-orange-700",
    approved: "bg-green-100 text-green-700",
    accepted: "bg-green-100 text-green-700",
    resolved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    revoked: "bg-gray-200 text-gray-700",
}

// No explicit status enum on Absence/GatePass/Appointment (unlike
// Complaint/Referral) — derive one from whichever timestamp is set, the
// same terminal states those two models use elsewhere.
const deriveStatus = (row) => {
    if (row.revoked_at) return "revoked"
    if (row.rejected_at) return "rejected"
    if (row.appointment_status) return row.appointment_status === "accepted" ? "approved" : row.appointment_status
    if (row.confirmed_at) return "approved"
    return "pending"
}

const MyCurrentSemesterRecordsModal = ({ close, closeModal, mode = "mine" }) => {
    const { props } = usePage()
    const sys = props.current_school_year_semester
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState(null)
    const isAll = mode === "all"

    useEffect(() => {
        if (!close) return
        setLoading(true)
        const fetcher = isAll
            ? DashboardService.getAllCurrentSemesterRecords
            : DashboardService.getMyCurrentSemesterRecords
        fetcher((res) => {
            setData(res)
            setActiveTab(Object.keys(res)[0] ?? null)
            setLoading(false)
        })
    }, [close])

    const tabs = data
        ? Object.keys(data)
            .filter((key) => TAB_META[key])
            .map((key) => ({ key, label: TAB_META[key].label, icon: TAB_META[key].icon }))
        : []

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            isEnableOuterClose={true}
            cntr={true}
            pd={["px-6", "py-6"]}
            bgColor="bg-white"
            w="w-[40rem]"
        >
            <div className="grid gap-4 max-h-[80vh]">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                        {isAll ? "All Records This Semester" : "My Records This Semester"}
                    </h2>
                    {sys && (
                        <p className="text-[0.8em] font-medium text-blue-700">
                            {formatSchoolYearSemester(sys)} &middot; {readableDate(sys.date_start)} - {readableDate(sys.date_end)}
                        </p>
                    )}
                    <p className="text-[0.85em] text-gray-500">
                        {isAll
                            ? "Every complaint, referral, absent form, gate pass, and appointment filed during the currently active semester."
                            : "Everything you've filed during the currently active semester."}
                    </p>
                </div>

                {loading ? (
                    <div className="grid gap-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-14 bg-gray-100 rounded-md animate-pulse" />
                        ))}
                    </div>
                ) : tabs.length === 0 ? (
                    <p className="text-[0.85em] text-gray-500 py-6 text-center">
                        You don't have access to any of these record types.
                    </p>
                ) : (
                    <>
                        <TabSwitcher tabs={tabs} value={activeTab} onChange={setActiveTab} />
                        <div className="overflow-y-auto max-h-[24rem] grid gap-2">
                            {(data[activeTab] ?? []).length === 0 ? (
                                <p className="text-[0.85em] text-gray-500 py-6 text-center">
                                    Nothing filed this semester.
                                </p>
                            ) : (
                                data[activeTab].map((row) => (
                                    <RecordRow key={row.id} type={activeTab} row={row} showOwner={isAll} />
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </UpModal>
    )
}

const fullName = (profile) => profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null

const RecordRow = ({ type, row, showOwner }) => {
    const meta = TAB_META[type]
    const status = meta.status ? row[meta.status] : deriveStatus(row)
    const reference = meta.number ? row[meta.number] : `#${row.id}`
    const subjectName = fullName(row.subject?.profile) ?? fullName(row.referred_student?.profile)
    const ownerName = showOwner ? fullName(row.user?.profile) : null

    const body = (
        <>
            <div className="min-w-0">
                <div className="font-medium text-gray-800 text-[0.9em] truncate">{reference}</div>
                {ownerName && (
                    <div className="text-[0.75em] text-gray-500 truncate">
                        {type === "referral" ? "By" : "Student"}: {ownerName}
                    </div>
                )}
                {subjectName && (
                    <div className="text-[0.75em] text-gray-500 truncate">Re: {subjectName}</div>
                )}
                <div className="text-[0.75em] text-gray-500">
                    {readableDate(row.created_at)} ({readableTime(row.created_at)})
                </div>
            </div>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[0.75em] font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
                {toTitleCase(status)}
            </span>
        </>
    )

    if (meta.route) {
        return (
            <Link
                href={`${meta.route}?view=${row.id}`}
                className="flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-4 py-3 transition-colors"
            >
                {body}
            </Link>
        )
    }

    return (
        <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
            {body}
        </div>
    )
}

export default MyCurrentSemesterRecordsModal
