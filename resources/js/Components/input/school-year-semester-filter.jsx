import DropdownField from "@/Components/input/dropdown"
import { PageActions } from "@/context-provider/page-title-provider"
import { router } from "@inertiajs/react"

// School year + semester dropdowns for a list page, with the page's title
// actions beside them (use with <PageLayout actionsWithFilters>). Choosing a
// value reloads the page with ?school-year=&semester= (other query params,
// e.g. the current tab, are kept); the server filters the list.
// `defaults` ({ schoolYear, semester }): what to show while the URL has
// neither, e.g. the current period on a list the server opens on it.
export const useSchoolYearSemester = (defaults = null) => {
    const url = new URLSearchParams(window.location.search)
    const unset = !url.has("school-year") && !url.has("semester")
    return {
        schoolYear: url.get("school-year") || (unset && defaults?.schoolYear) || "all",
        semester: url.get("semester") || (unset && defaults?.semester ? String(defaults.semester) : "all"),
    }
}

// `allowAll` false: no "All School Years" / "All Semesters" options, so a
// specific period is always selected (used with `defaults`).
// `allLabels`: the text of the "all" option, e.g. ["Select School Year", "Select Semester"].
const SchoolYearSemesterFilter = ({ schoolYears = [], defaults = null, allowAll = true, allLabels = ["All School Years", "All Semesters"] }) => {
    const { schoolYear, semester } = useSchoolYearSemester(defaults)

    const change = (field, value) => {
        const url = new URLSearchParams(window.location.search)
        url.set("school-year", schoolYear)
        url.set("semester", semester)
        url.set(field, value)
        url.delete("id") // a single-row view ends when a filter changes
        router.get(`${window.location.pathname}?${url.toString()}`, {}, { preserveState: true, preserveScroll: true })
    }

    return (
        <div className="flex flex-wrap gap-3 md:max-lg:flex-row md:max-lg:flex-nowrap md:max-lg:items-center md:max-lg:[&>div:not(:last-child)]:flex-1 md:max-lg:[&>div:not(:last-child)]:min-w-0 md:max-lg:[&>div:not(:last-child)]:w-auto">
            <div className="w-full sm:w-56">
                <DropdownField
                    default={allowAll ? { val: "all", label: allLabels[0] } : null}
                    list={schoolYears.map((y) => ({ val: y, label: y }))}
                    val={schoolYear}
                    onChange={(e) => change("school-year", e.target.value)}
                />
            </div>
            <div className="w-full sm:w-56">
                <DropdownField
                    default={allowAll ? { val: "all", label: allLabels[1] } : null}
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
