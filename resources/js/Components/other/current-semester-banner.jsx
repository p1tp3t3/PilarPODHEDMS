import { usePage, Link } from "@inertiajs/react"
import { formatSchoolYearSemester, readableDate } from "@/others/function"
import { CalendarDays, ChevronRight } from "lucide-react"

// Reads the shared `current_school_year_semester` prop (HandleInertiaRequests)
// directly, so any dashboard just drops this in without its own controller
// needing to query and pass it.
const CurrentSemesterBanner = () => {
    const { props } = usePage()
    const sys = props.current_school_year_semester
    // Only a super admin can actually manage school years/semesters — for
    // everyone else this is purely informational.
    const isSuperAdmin = props.auth?.user?.role === "super_admin"

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
            {isSuperAdmin && <ChevronRight className="text-blue-400 flex-shrink-0 ml-auto" size={18} />}
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
        <div className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 mb-6">
            {content}
        </div>
    )
}

export default CurrentSemesterBanner
