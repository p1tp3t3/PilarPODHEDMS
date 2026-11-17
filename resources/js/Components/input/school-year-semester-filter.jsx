import DropdownField from "@/Components/input/dropdown"
import { PageActions } from "@/context-provider/page-title-provider"
import { setListQuery, useListQuery } from "@/others/hooks/use-list-data"

// School year + semester dropdowns for a list page, with the page's title
// actions beside them (use with <PageLayout actionsWithFilters>). Choosing a
// value sets ?school-year=&semester= in the address bar (other query params,
// e.g. the current tab, are kept) and the page's lists are fetched again
// from their API with it — no page request.
// `defaults` ({ schoolYear, semester }): what to show while the URL has
// neither, e.g. the current period on a list the server opens on it.
export const useSchoolYearSemester = (defaults = null) => {
    const url = useListQuery()
    const unset = !url.has("school-year") && !url.has("semester")
    return {
        schoolYear: url.get("school-year") || (unset && defaults?.schoolYear) || "all",
        semester: url.get("semester") || (unset && defaults?.semester ? String(defaults.semester) : "all"),
    }
}

// `allowAll` false: no "All School Years" / "All Semesters" options, so a
// specific period is always selected (used with `defaults`).
// `allLabels`: the text of the "all" option, e.g. ["Select School Year", "Select Semester"].
// `children`: more filters shown first in the same row (e.g. a Program dropdown).
const SchoolYearSemesterFilter = ({ schoolYears = [], defaults = null, allowAll = true, allLabels = ["All School Years", "All Semesters"], children }) => {
    const { schoolYear, semester } = useSchoolYearSemester(defaults)

    const change = (field, value) => {
        const url = new URLSearchParams(window.location.search)
        url.set("school-year", schoolYear)
        url.set("semester", semester)
        url.set(field, value)
        url.delete("id") // a single-row view ends when a filter changes
        setListQuery(url)
    }

    return (
        <div className="flex flex-wrap gap-3 md:max-lg:flex-row md:max-lg:flex-nowrap md:max-lg:items-center md:max-lg:[&>div:not(:last-child)]:flex-1 md:max-lg:[&>div:not(:last-child)]:min-w-0 md:max-lg:[&>div:not(:last-child)]:w-auto">
            {children}
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
