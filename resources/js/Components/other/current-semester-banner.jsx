import { usePage, Link } from "@inertiajs/react"
import { formatSchoolYearSemester, readableDate } from "@/others/function"
import { CalendarDays, ChevronRight } from "lucide-react"
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

    const content = (
        <>
            <CalendarDays className="text-blue-600 flex-shrink-0" size={20} />
            {sys ? (
                <p className="text-[0.85em] text-blue-900">
                    <span className="font-semibold">{formatSchoolYearSemester(sys)}</span>
                    <span className="text-blue-700"> &middot; {readableDate(sys.date_start)} - {readableDate(sys.date_end)}</span>
                </p>
            ) : (
                <p className="text-[0.85em] font-semibold text-blue-900">
                    No active school year/semester is currently set.
                </p>
            )}
            <ChevronRight className="text-blue-400 flex-shrink-0 ml-auto" size={18} />
        </>
    )

    if (isSuperAdmin) {
        return (
            <Link
                href="/super-admin/school-year"
                className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 mb-6 hover:bg-blue-100 transition-colors"
            >
                {content}
            </Link>
        )
    }

    return (
        <>
            <MyCurrentSemesterRecordsModal
                close={recordsModal}
                closeModal={openRecordsModal}
                mode={isPrefect ? "all" : "mine"}
            />
            <button
                type="button"
                onClick={() => openRecordsModal(true)}
                className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 mb-6 hover:bg-blue-100 transition-colors text-left"
            >
                {content}
            </button>
        </>
    )
}

export default CurrentSemesterBanner
