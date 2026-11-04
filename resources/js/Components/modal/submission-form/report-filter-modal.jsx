import UpModal from "../up-modal"
import RadioButton from "@/Components/input/radio"
import DropdownField from "@/Components/input/dropdown"
import BetweenTextfield from "@/Components/input/between-input"
import { useEffect, useState } from "react"
import { SlidersHorizontal } from "lucide-react"

const semesterList = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]

export const EMPTY_REPORT_FILTER = { filter_by: "date", date_from: "", date_to: "", school_year_id: "", semester: "" }

export const isUsableReportFilter = (f) =>
    f.filter_by === "date" ? Boolean(f.date_from && f.date_to) : Boolean(f.school_year_id)

// "Mar 1, 2026 – Mar 31, 2026" / "SY 2025-2026 · 1st Semester", for the
// chip beside the Filter button.
export const reportFilterSummary = (f, schoolYears = []) => {
    if (!isUsableReportFilter(f)) return null
    if (f.filter_by === "date") {
        const fmt = (d) => new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        return `${fmt(f.date_from)} – ${fmt(f.date_to)}`
    }
    const year = schoolYears.find((y) => String(y.id) === String(f.school_year_id))?.year
    const sem = semesterList.find((s) => String(s.val) === String(f.semester))?.label ?? "All Semesters"
    return `SY ${year ?? ""} · ${sem}`
}

// The report pages' filter (date range, or school year + semester). Edits a
// draft copy, so closing the modal without applying leaves the list as is.
// Optional: `extraFields(draft, setDraft)` renders more fields above the
// date/school-year choice, `emptyValue` is what Clear resets to, and
// `canApply(draft)` replaces the default "a full range is set" rule.
const ReportFilterModal = ({ close, closeModal, value, schoolYears = [], onApply, onClear, allSemestersLabel = "All Semesters", schoolYearLabel = "Select School Year", description = "Show only the records within a date range or a school year.", extraFields, emptyValue = EMPTY_REPORT_FILTER, canApply = isUsableReportFilter }) => {
    const [draft, setDraft] = useState(value)

    // Start from the filter currently applied each time it opens.
    useEffect(() => { if (close) setDraft(value) }, [close])

    const usable = canApply(draft)

    const apply = () => {
        if (!usable) return
        onApply(draft)
        closeModal(false)
    }

    const clear = () => {
        setDraft(emptyValue)
        onClear()
        closeModal(false)
    }

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            isEnableOuterClose={true}
            cntr={true}
            pd={["px-6", "py-6"]}
            bgColor="bg-white"
            w="w-[32rem]"
        >
            <div className="grid gap-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
                        <SlidersHorizontal size={18} />
                    </div>
                    <div>
                        <div className="font-semibold text-gray-800">Filter Records</div>
                        <p className="text-[0.85em] text-gray-500">
                            {description}
                        </p>
                    </div>
                </div>

                {extraFields?.(draft, setDraft)}

                <RadioButton
                    list={[
                        { val: "date", label: "Date Range" },
                        { val: "school_year", label: "School Year" },
                    ]}
                    id="filter_by"
                    name="filter_by"
                    val={draft.filter_by}
                    // Switching clears the range fields but keeps any extra ones.
                    change={(e) => setDraft((prev) => ({ ...prev, ...EMPTY_REPORT_FILTER, filter_by: e.target.value }))}
                />

                {draft.filter_by === "date" &&
                <BetweenTextfield
                    type="date"
                    labels={["Date From", "Date To"]}
                    name={["date_from", "date_to"]}
                    id={["date_from", "date_to"]}
                    data={[draft.date_from, draft.date_to]}
                    setData={(updater) => {
                        setDraft((prev) => {
                            const next = typeof updater === "function"
                                ? updater({ date_from: prev.date_from, date_to: prev.date_to })
                                : updater
                            return { ...prev, date_from: next.date_from ?? "", date_to: next.date_to ?? "" }
                        })
                    }}
                />}

                {draft.filter_by === "school_year" &&
                <div className="grid sm:grid-cols-2 gap-3">
                    <DropdownField
                        default={{ val: "", label: schoolYearLabel }}
                        list={schoolYears.map((y) => ({ val: y.id, label: y.year }))}
                        onChange={(e) => setDraft((prev) => ({ ...prev, school_year_id: e.target.value }))}
                        name="school_year_id"
                        val={draft.school_year_id}
                    />
                    <DropdownField
                        default={{ val: "", label: allSemestersLabel }}
                        list={semesterList}
                        onChange={(e) => setDraft((prev) => ({ ...prev, semester: e.target.value }))}
                        name="semester"
                        val={draft.semester}
                    />
                </div>}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={clear}
                        className="px-4 py-2 text-[0.9em] rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Clear Filter
                    </button>
                    <button
                        type="button"
                        onClick={apply}
                        disabled={!usable}
                        className={`px-4 py-2 text-[0.9em] rounded text-white ${
                            usable ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
                        }`}
                    >
                        Apply Filter
                    </button>
                </div>
            </div>
        </UpModal>
    )
}

export default ReportFilterModal
