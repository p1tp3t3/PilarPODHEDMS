import { useState } from "react"
import { usePage } from "@inertiajs/react"
import { Button } from "@mui/material"
import { CalendarPlus } from "lucide-react"
import AppointmentModal from "@/Components/modal/submission-form/set-appointment-modal"
import { useReload } from "@/context-provider/reload-provider"

/**
 * "Intervene": opens the Set Appointment form for one student (fixed, can't
 * be swapped), with the violation(s) it is about already chosen. The Prefect
 * only (nothing for anyone else).
 *
 *   <InterveneBtn student={user} violationIds={[3, 8]} reason="<p>...</p>" />
 * student: { id, role, profile: { first_name, last_name, profile_picture, sex } }
 */
// extraPayload: sent with the appointment, e.g. { complaint_id } when set
// from a complaint (listed under Complaints on the Interventions page).
const InterveneBtn = ({ student, violationIds = [], reason, extraPayload }) => {
    const viewer = usePage().props.auth?.user
    const { loadRegister } = useReload()
    const [open, setOpen] = useState(false)

    if (viewer?.role !== "sub_admin" || !student?.id) return null

    return (
        <>
            {/* Small: it sits beside a name, not in a toolbar. */}
            <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<CalendarPlus size={15} />}
                onClick={() => setOpen(true)}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, py: 0.25, px: 1.25, minHeight: 0, lineHeight: 1.6, flexShrink: 0 }}
            >
                Intervene
            </Button>
            <AppointmentModal
                label="Set Appointment"
                title="Intervene"
                subtitle={"Set an appointment with the student to talk about their violation(s)."}
                close={open}
                closeModal={setOpen}
                pd={["px-5", "py-7"]}
                isEnableOuterClose={true}
                id={viewer.id}
                user_type={viewer.role}
                reload={loadRegister}
                lockedUser={{ ...student, role: student.role ?? "student" }}
                defaultReason={reason ?? "<p>Consultation with the Prefect of Discipline regarding your recent violations.</p>"}
                defaultViolationIds={violationIds}
                extraPayload={extraPayload}
            />
        </>
    )
}

export default InterveneBtn
