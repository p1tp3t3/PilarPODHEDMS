import { useEffect, useState } from "react"
import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { SchoolYearService } from "@/others/services/school-year-service"
import { readableDate } from "@/others/function"

const dayShift = (date, days) => {
    const d = new Date(`${date}T00:00:00`)
    d.setDate(d.getDate() + days)
    // Local date (toISOString would shift to UTC, a day early here).
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const SetSemesterDatesModal = ({ close, closeModal, semester, siblingSemester, reload, setter }) => {
    const [dateStart, setDateStart] = useState("")
    const [dateEnd, setDateEnd] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (semester) {
            setDateStart((semester.date_start || "").slice(0, 10))
            setDateEnd((semester.date_end || "").slice(0, 10))
            setError("")
        }
    }, [semester])

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!dateStart || !dateEnd) {
            setError("Both dates are required.")
            return
        }
        if (dateEnd < dateStart) {
            setError("End date must be after the start date.")
            return
        }
        // Neighbouring semesters move with these dates (checked server-side).
        setError("")

        reload(true, "text-wait", "Updating Semester Dates")
        // The upcoming school year isn't stored yet: its dates are planned.
        const save = semester.upcoming
            ? (...args) => SchoolYearService.updateUpcomingDates(semester.semester, ...args)
            : (...args) => SchoolYearService.updateSemesterDates(semester.id, ...args)
        save(
            dateStart,
            dateEnd,
            setter,
            () => {
                reload(true, "success", "Semester Dates Updated Successfully")
                closeModal(false)
            },
            (err) => reload(true, "error", err?.response?.data?.message || "Failed to Update Semester Dates")
        )
    }

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            isEnableOuterClose={true}
            pd={["px-5", "py-7"]}
            bgColor="bg-white"
            w="w-[26rem]"
        >
            <div className="w-full">
                <h1 className="text-[1.2em] font-bold">
                    {semester ? `${semester.semester === 1 ? "1st" : "2nd"} Semester Dates${semester.upcoming ? ` · SY ${semester.year}` : ""}` : "Semester Dates"}
                </h1>
                <p className="text-[0.8em] text-gray-500 mt-1">
                    Sets when this semester runs — the day after it ends, prefects are notified of any
                    complaints, referrals, absent forms, or gate passes still unresolved from it.
                </p>
                <form onSubmit={handleSubmit} className="grid gap-5 mt-4">
                    <FormTextfield
                        label="Start Date"
                        type="date"
                        name="date_start"
                        val={dateStart}
                        change={(e) => setDateStart(e.target.value)}
                        req={true}
                        readOnly={!!semester?.start_locked}
                    />
                    {semester?.start_locked && (
                        <p className="text-[0.75em] text-gray-500 -mt-3">
                            Fixed: it's the day after the previous school year ended, and that school year can't be edited anymore.
                        </p>
                    )}
                    <FormTextfield
                        label="End Date"
                        type="date"
                        name="date_end"
                        val={dateEnd}
                        change={(e) => setDateEnd(e.target.value)}
                        min={dateStart || undefined}
                        error={error}
                        req={true}
                    />
                    {/* Semesters run back to back, so the neighbours follow these dates. */}
                    {semester && dateStart && dateEnd && (
                        <ul className="text-[0.75em] text-blue-900 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 grid gap-1 list-disc list-inside">
                            {dateStart !== (semester.date_start || "").slice(0, 10) && (
                                <li>
                                    The {semester.semester === 1 ? "previous school year's 2nd Sem" : "1st Sem"} will end on <b>{readableDate(dayShift(dateStart, -1))}</b>.
                                </li>
                            )}
                            {dateEnd !== (semester.date_end || "").slice(0, 10) && (
                                <li>
                                    The {semester.semester === 1 ? "2nd Sem" : "next school year's 1st Sem"} will start on <b>{readableDate(dayShift(dateEnd, 1))}</b>.
                                </li>
                            )}
                            {dateStart === (semester.date_start || "").slice(0, 10) && dateEnd === (semester.date_end || "").slice(0, 10) && (
                                <li>Changing these dates also moves the semester before (its end) and after (its start), so there are no gaps.</li>
                            )}
                        </ul>
                    )}
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Save Dates" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default SetSemesterDatesModal
