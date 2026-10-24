import DropdownField from "@/Components/input/dropdown"
import { PageActions } from "@/context-provider/page-title-provider"
import { router } from "@inertiajs/react"

// School year + semester dropdowns for a list page, with the page's title
// actions beside them (use with <PageLayout actionsWithFilters>). Choosing a
// value reloads the page with ?school-year=&semester= (other query params,
// e.g. the current tab, are kept); the server filters the list.
export const useSchoolYearSemester = () => {
    const url = new URLSearchParams(window.location.search)
    return { schoolYear: url.get("school-year") || "all", semester: url.get("semester") || "all" }
}

const SchoolYearSemesterFilter = ({ schoolYears = [] }) => {
    const { schoolYear, semester } = useSchoolYearSemester()

    const change = (field, value) => {
        const url = new URLSearchParams(window.location.search)
        url.set(field, value)
        router.get(`${window.location.pathname}?${url.toString()}`, {}, { preserveState: true, preserveScroll: true })
    }

    return (
        <div className="flex flex-wrap gap-3 md:max-lg:flex-row md:max-lg:flex-nowrap md:max-lg:items-center md:max-lg:[&>div:not(:last-child)]:flex-1 md:max-lg:[&>div:not(:last-child)]:min-w-0 md:max-lg:[&>div:not(:last-child)]:w-auto">
            <div className="w-full sm:w-56">
                <DropdownField
                    default={{ val: "all", label: "All School Years" }}
                    list={schoolYears.map((y) => ({ val: y, label: y }))}
                    val={schoolYear}
                    onChange={(e) => change("school-year", e.target.value)}
                />
            </div>
            <div className="w-full sm:w-56">
                <DropdownField
                    default={{ val: "all", label: "All Semesters" }}
                    list={[
                        { val: 1, label: "1st Semester" },
                        { val: 2, label: "2nd Semester" },
                    ]}
                    val={semester === "all" ? "all" : Number(semester)}
                    onChange={(e) => change("semester", e.target.value)}
                />
            </div>
            <PageActions />
        </div>
    )
}

export default SchoolYearSemesterFilter
