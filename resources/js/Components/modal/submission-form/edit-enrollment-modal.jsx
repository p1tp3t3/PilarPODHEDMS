import UpModal from "../up-modal"
import DropdownField from "@/Components/input/dropdown"
import { useState, useEffect } from "react"
import { usePage } from "@inertiajs/react"
import { Button } from "@mui/material"
import { CalendarDays } from "lucide-react"
import { change, ordinal } from "@/others/function"
import { AccountService } from "@/others/services/account-service"
import { validateForm, hasErrors, required } from "@/others/validation"

const yearLevelList = [
    { val: 1, label: "1st Year" },
    { val: 2, label: "2nd Year" },
    { val: 3, label: "3rd Year" },
    { val: 4, label: "4th Year" },
]

// School year and semester are always the current period (the server saves
// that period too); only the program and year level are edited.
const EditEnrollmentModal = ({ close, closeModal, data, program, schoolYears, reload }) => {
    const currentSys = usePage().props.current_school_year_semester
    const [form, setForm] = useState({
        student_id: "", program_id: "", year_level: "", semester: "",
        school_year_id: "",
    })

    useEffect(() => {
        if (data) {
            const current = data.enrollments?.[data.enrollments.length - 1]
            setForm({
                student_id: data.id,
                program_id: current?.program_id ?? "",
                year_level: current?.year_level ?? "",
                semester: currentSys?.semester ?? "",
                school_year_id: currentSys?.school_year_id ?? "",
            })
        }
    }, [data, currentSys?.school_year_id, currentSys?.semester])

    const [errs, setErrs] = useState({})
    const handleChange = (e) => {
        change(e, setForm)
        setErrs((prev) => ({ ...prev, [e.target.name]: undefined, [`${e.target.name}Asterisk`]: false }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const found = validateForm(form, {
            program_id: [required("Program")],
            year_level: [required("Year level")],
        })
        setErrs(found)
        if (hasErrors(found)) return
        reload(true, "text-wait", "Updating Program. Please Wait")
        AccountService.updateEnrollment(
            form,
            () => {
                reload(true, "success", "Program Updated Successfully.")
                setTimeout(() => {
                    reload(false)
                    window.location.reload()
                }, 1500)
            },
            (err) => {
                reload(true, "error", err.response?.data?.message ?? "Failed to Update Program.")
                setTimeout(() => reload(false), 2000)
            }
        )
    }

    const fullName = [data?.profile?.first_name, data?.profile?.last_name].filter(Boolean).join(" ")
    const period = currentSys?.school_year?.year
        ? `School Year ${currentSys.school_year.year.replace("-", "–")} · ${ordinal(currentSys.semester)} Semester`
        : null

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            pd={["px-6", "py-6"]}
            isEnableOuterClose={true}
            bgColor="bg-white"
            w="w-[30rem]"
            cntr={true}
        >
            <form onSubmit={handleSubmit} className="w-full grid gap-5">
                {/* Header */}
                <div className="pt-2 pr-6 min-w-0 text-[1.1em] sm:text-[1.2em]">
                    <h1><b>Edit Program</b></h1>
                    <p className="text-[0.7em] text-gray-500 truncate">
                        {[fullName, data?.id_number].filter(Boolean).join(" · ")}
                    </p>
                </div>

                {/* The period this saves to: fixed, not a field. */}
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                    <CalendarDays size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-[0.85em] leading-snug">
                        <p className="font-medium text-blue-900">{period ?? "No active school year and semester"}</p>
                        <p className="text-blue-700">
                            {period ? "The current period — applied automatically." : "Set one in School Year before editing."}
                        </p>
                    </div>
                </div>

                {/* Editable fields */}
                <div className="grid gap-4">
                    <label className="grid gap-1.5">
                        <span className="text-[0.8em] font-medium text-gray-600">Program</span>
                        <DropdownField
                            default={{ val: "", label: "Select Program" }}
                            list={program ?? []}
                            val={form.program_id}
                            onChange={handleChange}
                            name="program_id"
                            error={errs.program_id}
                            errorAsterisk={errs.program_idAsterisk}
                        />
                    </label>
                    <label className="grid gap-1.5">
                        <span className="text-[0.8em] font-medium text-gray-600">Year Level</span>
                        <DropdownField
                            default={{ val: "", label: "Select Year Level" }}
                            list={yearLevelList}
                            val={form.year_level}
                            onChange={handleChange}
                            name="year_level"
                            error={errs.year_level}
                            errorAsterisk={errs.year_levelAsterisk}
                        />
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                    <Button
                        type="button"
                        variant="outlined"
                        onClick={() => closeModal(false)}
                        sx={{ textTransform: "none", borderRadius: "0.5rem", color: "text.secondary", borderColor: "divider" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disableElevation
                        disabled={!period}
                        sx={{ textTransform: "none", borderRadius: "0.5rem", px: 2.5 }}
                    >
                        Save Changes
                    </Button>
                </div>
            </form>
        </UpModal>
    )
}

export default EditEnrollmentModal
