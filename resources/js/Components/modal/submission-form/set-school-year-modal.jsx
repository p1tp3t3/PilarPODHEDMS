import { useState } from "react"
import UpModal from "../up-modal"
import DropdownField from "@/Components/input/dropdown"
import FormButton from "@/Components/button/button"
import { SchoolYearService } from "@/others/services/school-year-service"

const yearOptions = (() => {
    const currentYear = new Date().getFullYear() - 1
    return Array.from({ length: 7 }, (_, i) => {
        const start = currentYear + i
        const label = `${start}-${start + 1}`
        return { val: label, label }
    })
})()

const SetSchoolYearModal = ({ close, closeModal, isEnableOuterClose, pd, reload, setter }) => {
    const [year, setYear] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!year) {
            setError("Select a school year.")
            return
        }
        setError("")

        reload(true, "text-wait", "Adding School Year")

        SchoolYearService.create(
            year,
            setter,
            () => {
                reload(true, "success", "School Year Added Successfully")
                setYear("")
                closeModal(false)
            },
            (err) => {
                reload(true, "error", err?.response?.data?.message || "Failed to Add School Year")
            }
        )
    }

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            isEnableOuterClose={isEnableOuterClose}
            pd={pd}
            bgColor="bg-white"
            w="w-[26rem]"
        >
            <div className="w-full">
                <h1 className="text-[1.2em] font-bold">Add School Year</h1>
                <p className="text-[0.8em] text-gray-500 mt-1">Pick the school year to add.</p>
                <form onSubmit={handleSubmit} className="grid gap-5 mt-4">
                    <DropdownField
                        default={{ val: "", label: "Select School Year" }}
                        list={yearOptions}
                        val={year}
                        onChange={(e) => setYear(e.target.value)}
                        name="year"
                        error={error}
                    />
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Add School Year" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default SetSchoolYearModal
