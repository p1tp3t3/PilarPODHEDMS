import CurrentDateTime from "./current-datetime"
import CurrentSemesterBanner from "./current-semester-banner"
import { PrefectAvailabilityCard } from "./prefect-availability"

/**
 * Today's date/time, the current school year/semester and the prefect's
 * availability, in one card: a single row of three on desktop, stacked on
 * phones. Every dashboard shows this.
 */
const DashboardInfoBar = () => (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Each section in its own cell, with plain borders as dividers (top
            on phones, left on desktop) so dark mode recolours them and they
            never land on the popups the sections render. */}
        <div className="min-w-0"><CurrentDateTime /></div>
        <div className="min-w-0 border-t lg:border-t-0 lg:border-l border-gray-200"><CurrentSemesterBanner /></div>
        <div className="min-w-0 border-t lg:border-t-0 lg:border-l border-gray-200"><PrefectAvailabilityCard /></div>
    </div>
)

export default DashboardInfoBar
