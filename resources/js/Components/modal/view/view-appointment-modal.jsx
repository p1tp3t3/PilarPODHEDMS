import UpModal from "../up-modal"
import { AppointmentService } from "@/others/services/appointment-service"
import { readableDate, readableTime } from "@/others/function"
import { useEffect, useState } from "react"
import { Box, Stack } from "@mui/material"
import { Link2, MessageSquareText, XCircle } from "lucide-react"
import { ModalHeader, Section, People, Pill, Text, TextBox, RecordBody, ViewModalSkeleton } from "./view-modal-parts"

// The appointment's status, one label: replied (Waiting for Reply /
// Declined), then attendance once accepted (Scheduled / Attended / Absent).
const statusOf = (d) => {
    if (d.appointment_status === "rejected") return { label: "Declined", tone: "red" }
    if (d.appointment_status !== "accepted") return { label: "Waiting for Reply", tone: "amber" }
    if (d.attendance_status === "present") return { label: "Attended", tone: "green" }
    if (d.attendance_status === "absent") return { label: "Absent", tone: "red" }
    return { label: "Scheduled", tone: "blue" }
}

// The reason may be saved editor HTML: shown as plain text (never as HTML).
const plain = (html) => {
    if (!html) return ""
    const doc = new DOMParser().parseFromString(String(html).replace(/<\/p>|<br\s*\/?>/gi, "\n"), "text/html")
    return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim()
}

// Read-only appointment details, fetched by the appointment's own id —
// deliberately separate from AppointmentEventModal (which needs a full
// FullCalendar event shape and carries admin-only cancel/reschedule/mark-
// attendance actions that don't belong in a plain "view" deep link).
// Laid out like the other record views (complaint, referral, gate pass).
const ViewAppointmentModal = ({ close, closeModal, id }) => {
    const [data, setData] = useState(null)

    useEffect(() => {
        if (close && id) {
            setData(null)
            AppointmentService.getAppointmentInfo(id, setData)
        }
    }, [close, id])

    const status = data ? statusOf(data) : null
    const name = data?.user?.profile?.first_name

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} cntr={true} pd={["p-0", ""]} bgColor="bg-white" w="w-[36rem] max-w-[90vw]">
            <Box sx={{ width: "100%" }}>
                {!data ? <ViewModalSkeleton variant="record" /> : (
                    <>
                        <ModalHeader
                            title={name ? `${name}'s Appointment` : "Appointment"}
                            reference={data.appointment_number}
                            person={data.user}
                            personLabel="With"
                            badge={<Pill tone={status.tone} label={status.label} />}
                        />
                        <RecordBody>
                            <People rows={[
                                { label: "Date", content: <Text>{readableDate(data.date_time_appoint)}</Text> },
                                { label: "Time", content: <Text>{readableTime(data.date_time_appoint)}</Text> },
                            ]} />

                            {data.description && (
                                <Section icon={MessageSquareText} title="Reason for the Appointment">
                                    <TextBox height="auto" sx={{ maxHeight: 200, whiteSpace: "pre-line" }}>{plain(data.description)}</TextBox>
                                </Section>
                            )}

                            {data.related_violations?.length > 0 && (
                                <Section icon={Link2} title="Related Violation(s)">
                                    <Stack direction="row" sx={{ gap: 0.75, flexWrap: "wrap" }}>
                                        {data.related_violations.map((v) => <Pill key={v.id} tone="blue" label={v.name} sx={{ height: 26, fontWeight: 500 }} />)}
                                    </Stack>
                                </Section>
                            )}

                            {data.rejected_reason && (
                                <Section icon={XCircle} title="Reason for Declining" tone="red">
                                    <TextBox height="auto" tone="red" sx={{ whiteSpace: "pre-line" }}>{plain(data.rejected_reason)}</TextBox>
                                </Section>
                            )}
                        </RecordBody>
                    </>
                )}
            </Box>
        </UpModal>
    )
}

export default ViewAppointmentModal
