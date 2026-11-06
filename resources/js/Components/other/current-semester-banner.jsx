import { usePage } from "@inertiajs/react"
import { ordinal } from "@/others/function"
import { CalendarDays } from "lucide-react"
import { InfoSegment } from "./info-segment"

// "Aug 1 – Dec 31, 2026"; the year is written once when both dates share it.
const dateRange = (start, end) => {
    if (!start || !end) return null
    const s = new Date(start), e = new Date(end)
    const md = { month: "short", day: "numeric" }
    const full = { ...md, year: "numeric" }
    return s.getFullYear() === e.getFullYear()
        ? `${s.toLocaleDateString("en-US", md)} – ${e.toLocaleDateString("en-US", full)}`
        : `${s.toLocaleDateString("en-US", full)} – ${e.toLocaleDateString("en-US", full)}`
}
import { useState } from "react"
import MyCurrentSemesterRecordsModal from "@/Components/modal/view/my-current-semester-records-modal"

// Reads the shared `current_school_year_semester` prop (HandleInertiaRequests)
// directly, so any dashboard just drops this in without its own controller
// needing to query and pass it.
const CurrentSemesterBanner = () => {
    const { props } = usePage()
    const sys = props.current_school_year_semester
    const role = props.auth?.user?.role
    // Only a super admin can actually manage school years/semesters. A
    // prefect (sub_admin) has no personal allow_complaint/allow_referral/etc.
    // permissions row at all — they approve/manage everyone else's requests
    // rather than filing their own — so they get a system-wide view (every
    // record of every type this semester) instead of a "my records" one.
    // Everyone else (student, teaching/non-teaching staff, parent) gets a
    // read-only look at just their own records.
    const isSuperAdmin = role === "super_admin"
    const isPrefect = role === "sub_admin"
    const [recordsModal, openRecordsModal] = useState(false)

    // Spelled out: "School Year 2026–2027" over "1st Semester · Aug 1 – Dec 31, 2026".
    const segment = {
        icon: <CalendarDays size={17} />,
        title: sys?.school_year?.year
            ? `School Year ${sys.school_year.year.replace("-", "–")}`
            : "No active school year",
        subtitle: sys
            ? [sys.semester && `${ordinal(sys.semester)} Semester`, dateRange(sys.date_start, sys.date_end)].filter(Boolean).join(" · ")
            : (isSuperAdmin ? "Set one in School Year" : "Not set yet"),
    }

    // The super admin manages school years; everyone else sees this
    // semester's records.
    if (isSuperAdmin) {
        return <InfoSegment {...segment} href="/super-admin/school-year" />
    }

    return (
        <>
            <MyCurrentSemesterRecordsModal
                close={recordsModal}
                closeModal={openRecordsModal}
                mode={isPrefect ? "all" : "mine"}
            />
            <InfoSegment {...segment} onClick={() => openRecordsModal(true)} />
        </>
    )
}

export default CurrentSemesterBanner
