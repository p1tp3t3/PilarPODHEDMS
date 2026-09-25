import { useEffect, useState } from "react"
import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { SchoolYearService } from "@/others/services/school-year-service"

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
        if (siblingSemester) {
            const siblingStart = (siblingSemester.date_start || "").slice(0, 10)
            const siblingEnd = (siblingSemester.date_end || "").slice(0, 10)
            if (siblingStart && siblingEnd && dateStart <= siblingEnd && siblingStart <= dateEnd) {
                setError(`This overlaps with the ${siblingSemester.semester === 1 ? "1st" : "2nd"} Semester's dates (${siblingStart} to ${siblingEnd}).`)
                return
            }
        }
        setError("")

        reload(true, "text-wait", "Updating Semester Dates")
        SchoolYearService.updateSemesterDates(
            semester.id,
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
                    {semester ? `${semester.semester === 1 ? "1st" : "2nd"} Semester Dates` : "Semester Dates"}
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
                    />
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
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Save Dates" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default SetSemesterDatesModal
