import ProfileSectionWrapper from "@/wrapper/profile-section-wrapper"
import { getYearLevel, readableDate, replaceUnderScoreToSpace, toTitleCase } from "@/others/function"
import { GraduationCap, FolderOpen } from "lucide-react"

const EnrollmentHistory = ({ enrollments = [] }) => {
    const history = [...enrollments].reverse()

    return (
        <div className="grid gap-6">
            <ProfileSectionWrapper title="Enrollment History" icon={GraduationCap}>
                {history.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">
                        <FolderOpen size="2.5em" className="mb-2 mx-auto opacity-60" />
                        <p>No enrollment records found.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {history.map((e, i) => (
                            <div
                                key={e.id ?? i}
                                className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-[0.9em]"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-semibold text-gray-800">
                                        {e.school_year?.year} {e.semester ? `· ${e.semester} Semester` : ''}
                                    </span>
                                    <span className="text-gray-600">
                                        {e.status ? toTitleCase(replaceUnderScoreToSpace(e.status)) : 'N/A'}
                                    </span>
                                </div>
                                <div className="text-gray-600 mt-1">
                                    {e.program?.name ?? 'N/A'}
                                    {e.year_level != null ? ` · ${getYearLevel(e.year_level)}` : ''}
                                </div>
                                {(e.enrolled_at || e.dropped_at) &&
                                <div className="text-gray-500 mt-1 text-[0.9em]">
                                    {e.enrolled_at ? `Enrolled ${readableDate(e.enrolled_at)}` : ''}
                                    {e.dropped_at ? ` · Dropped ${readableDate(e.dropped_at)}` : ''}
                                </div>}
                            </div>
                        ))}
                    </div>
                )}
            </ProfileSectionWrapper>
        </div>
    )
}

export default EnrollmentHistory
