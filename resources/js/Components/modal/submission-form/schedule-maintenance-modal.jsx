import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "@/Components/button/button"
import { SystemService } from "@/others/services/system-service"
import { disablePrevDate, showWarningModal , showLoadingModal, closeLoadingModal } from "@/others/function"
import { useState } from "react"

// Combines what used to be two separate cards (pick a start date, write a
// notice) into one form — scheduling a maintenance window and telling
// everyone about it are really the same action, not two unrelated ones.
const ScheduleMaintenanceModal = ({ close, closeModal, onScheduled }) => {
    const [startsAt, setStartsAt] = useState("")
    const [message, setMessage] = useState("")
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()

        const errs = {}
        if (!startsAt) errs.starts_at = "Please pick a date and time."
        else if (new Date(startsAt) <= new Date()) errs.starts_at = "Pick a time in the future."
        const plainMessage = message.replace(/<[^>]*>/g, "").trim()
        if (!plainMessage) errs.message = "A message is required."
        setErrors(errs)
        if (Object.keys(errs).length > 0) return

        showWarningModal(
            "Are You Sure You Want To Schedule Maintenance And Notify All Users?",
            "Schedule Maintenance",
            "Cancel",
            () => {
                setSubmitting(true)
                showLoadingModal("Scheduling maintenance and notifying users")
                SystemService.scheduleMaintenanceMode(
                    startsAt,
                    message,
                    (res) => {
                        setSubmitting(false)
                        closeLoadingModal()
                        setStartsAt("")
                        setMessage("")
                        closeModal(false)
                        onScheduled?.(res)
                    },
                    (err) => {
                        setSubmitting(false)
                        closeLoadingModal()
                        setErrors({ starts_at: err?.response?.data?.message || "Failed to schedule maintenance." })
                    }
                )
            }
        )
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
            <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="pt-2 pr-6 text-[1.1em] sm:text-[1.2em]">
                    <h1><b>Schedule Maintenance</b></h1>
                </div>

                <FormTextfield
                    label="Starts At"
                    type="datetime-local"
                    name="starts_at"
                    id="starts_at"
                    val={startsAt}
                    min={disablePrevDate()}
                    change={(e) => { setStartsAt(e.target.value); if (errors.starts_at) setErrors((p) => ({ ...p, starts_at: "" })) }}
                    error={errors.starts_at}
                    req={true}
                />

                <RichTextEditor
                    label="Message"
                    val={message}
                    change={(html) => { setMessage(html); if (errors.message) setErrors((p) => ({ ...p, message: "" })) }}
                    minHeight="7rem"
                    req={true}
                />
                {errors.message && <p className="text-[0.8em] text-red-600 -mt-3">{errors.message}</p>}

                <div className="flex justify-end">
                    <FormButton
                        label={submitting ? "Scheduling..." : "Schedule Maintenance"}
                        type="submit"
                        loading={submitting}
                        enable={!submitting}
                    />
                </div>
            </form>
        </UpModal>
    )
}

export default ScheduleMaintenanceModal
