import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "@/Components/button/button"
import { SystemService } from "@/others/services/system-service"
import { disablePrevDate, showWarningModal } from "@/others/function"
import { useState } from "react"
import { CalendarClock } from "lucide-react"

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
                SystemService.scheduleMaintenanceMode(
                    startsAt,
                    message,
                    (res) => {
                        setSubmitting(false)
                        setStartsAt("")
                        setMessage("")
                        closeModal(false)
                        onScheduled?.(res)
                    },
                    (err) => {
                        setSubmitting(false)
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
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
                        <CalendarClock size={18} />
                    </div>
                    <div>
                        <div className="font-semibold text-gray-800">Schedule Maintenance</div>
                        <p className="text-[0.85em] text-gray-500">
                            Maintenance mode turns itself on automatically at the date/time you pick, and everyone is notified now.
                        </p>
                    </div>
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
