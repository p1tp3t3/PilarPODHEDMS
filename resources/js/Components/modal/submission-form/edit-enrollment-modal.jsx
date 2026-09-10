import UpModal from "../up-modal"
import DropdownField from "@/Components/input/dropdown"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { useState, useEffect } from "react"
import { change } from "@/others/function"
import { AccountService } from "@/others/services/account-service"

const semesterList = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]
const yearLevelList = [
    { val: 1, label: "1st Year" },
    { val: 2, label: "2nd Year" },
    { val: 3, label: "3rd Year" },
    { val: 4, label: "4th Year" },
]

const EditEnrollmentModal = ({ close, closeModal, data, program, schoolYears, reload }) => {
    const [form, setForm] = useState({
        student_id: "", program_id: "", year_level: "", semester: "",
        school_year_id: "", enrolled_at: "",
    })

    useEffect(() => {
        if (data) {
            const current = data.enrollments?.[data.enrollments.length - 1]
            setForm({
                student_id: data.id,
                program_id: current?.program_id ?? "",
                year_level: current?.year_level ?? "",
                semester: current?.semester ?? "",
                school_year_id: current?.school_year_id ?? "",
                enrolled_at: current?.enrolled_at ? current.enrolled_at.slice(0, 10) : "",
            })
        }
    }, [data])

    const handleChange = (e) => change(e, setForm)

    const handleSubmit = (e) => {
        e.preventDefault()
        reload(true, "text-wait", "Updating Enrollment. Please Wait")
        AccountService.updateEnrollment(
            form,
            () => {
                reload(true, "success", "Enrollment Updated Successfully.")
                setTimeout(() => {
                    reload(false)
                    window.location.reload()
                }, 1500)
            },
            (err) => {
                reload(true, "error", err.response?.data?.message ?? "Failed to Update Enrollment.")
                setTimeout(() => reload(false), 2000)
            }
        )
    }

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            pd={["px-10", "py-6"]}
            isEnableOuterClose={true}
            bgColor="bg-white"
            w="w-[32rem]"
            cntr={true}
        >
            <form onSubmit={handleSubmit} className="w-full grid gap-4">
                <h1 className="text-[1.2em]"><b>Edit Enrollment — {data?.id_number}</b></h1>
                <DropdownField
                    default={{ val: "", label: "Select Program" }}
                    list={program ?? []}
                    val={form.program_id}
                    onChange={handleChange}
                    name="program_id"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                    <DropdownField
                        default={{ val: "", label: "Select Year Level" }}
                        list={yearLevelList}
                        val={form.year_level}
                        onChange={handleChange}
                        name="year_level"
                    />
                    <DropdownField
                        default={{ val: "", label: "Select Semester" }}
                        list={semesterList}
                        val={form.semester}
                        onChange={handleChange}
                        name="semester"
                    />
                </div>
                <DropdownField
                    default={{ val: "", label: "Select School Year" }}
                    list={(schoolYears ?? []).map((s) => ({ val: s.id, label: s.year }))}
                    val={form.school_year_id}
                    onChange={handleChange}
                    name="school_year_id"
                />
                <FormTextfield
                    label="Enrolled Since"
                    name="enrolled_at"
                    id="enrolled_at"
                    type="date"
                    val={form.enrolled_at}
                    change={handleChange}
                />
                <FormButton type="submit" label="Save Changes" />
            </form>
        </UpModal>
    )
}

export default EditEnrollmentModal
