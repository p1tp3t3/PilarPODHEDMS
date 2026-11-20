import UpModal from "../up-modal"
import { Alert, Avatar, Box, Button, Chip, Divider, Stack, Typography } from "@mui/material"
import { appointmentStatusOf } from "@/others/appointment-status"
import { CalendarDays, CalendarClock, XCircle } from "lucide-react"
import { RelatedViolationsList } from "@/Components/input/related-violations-field"
import Btn from "@/Components/button/normal-btn"
import { getProfilePic } from "@/others/function"

// A small uppercase label over a part of the window.
const Label = ({ children }) => (
    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary", mb: 0.75 }}>
        {children}
    </Typography>
)

// "Present" / "Absent": simple buttons filled in their colour.
const AttendanceButton = ({ color, children, onClick }) => (
    <Button
        fullWidth
        variant="contained"
        disableElevation
        color={color}
        onClick={onClick}
        sx={{ textTransform: "none", fontWeight: 600 }}
    >
        {children}
    </Button>
)

const plain = (html) => {
    if (!html) return ""
    const doc = new DOMParser().parseFromString(String(html).replace(/<\/p>|<br\s*\/?>/gi, "\n"), "text/html")
    return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim()
}

// The calendar's appointment window: who and when, the reason and what it
// addresses, and (for an accepted one not yet marked) attendance, reschedule
// and cancel.
const AppointmentEventModal = ({ close, closeModal, event, onCancel, onReschedule, onMarkAttendance }) => {
    if (!event) {
        return <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} bgColor="bg-white" w="w-[28rem]" />
    }

    const { title, start, extendedProps } = event
    const isAccepted = extendedProps.status === "accepted"
    const statusMeta = appointmentStatusOf(extendedProps)
    const attendance = extendedProps.attendance_status || "not_marked"
    const profile = extendedProps.user?.profile
    const name = title.replace(" (Pending)", "")
    const reason = plain(extendedProps.description || extendedProps.reason)
    const when = start?.toLocaleString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    })

    // What can still be done with it (or why nothing can).
    const note = !isAccepted
        ? extendedProps.status === "rejected" ? "This appointment was rejected."
        : extendedProps.status === "cancelled" ? "This appointment was cancelled."
        : "Waiting for the student to accept or decline this appointment."
        : attendance !== "not_marked"
            ? "Attendance has already been recorded, so it can no longer be rescheduled, cancelled or re-marked."
            : null

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-6", "py-6"]} bgColor="bg-white" w="w-[28rem]">
            <Stack sx={{ gap: 2.25, width: "100%" }}>
                {/* Who, the reference and the status (clear of the close button). */}
                <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, pr: 4 }}>
                    <Avatar src={profile ? getProfilePic(profile.profile_picture, profile.sex) : undefined} sx={{ width: 44, height: 44 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3 }}>{name}</Typography>
                        {/* A pending invitation gets its number once it's accepted. */}
                        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                            {extendedProps.appointment_number ? `Ref. No. ${extendedProps.appointment_number}` : "Ref. No. assigned once accepted"}
                        </Typography>
                    </Box>
                    <Chip
                        label={statusMeta.label}
                        size="small"
                        sx={{ fontWeight: 700, flexShrink: 0, backgroundColor: statusMeta.bg, color: statusMeta.text }}
                    />
                </Stack>

                <Stack direction="row" sx={{ alignItems: "center", gap: 1.25, px: 1.5, py: 1.25, borderRadius: 2, border: 1, borderColor: "divider" }}>
                    <Box sx={{ color: "primary.main", display: "flex" }}><CalendarDays size={18} /></Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>{when}</Typography>
                </Stack>

                {reason && (
                    <Box>
                        <Label>Reason</Label>
                        <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.65, bgcolor: "action.hover", borderRadius: 2, px: 1.75, py: 1.25, whiteSpace: "pre-line" }}>
                            {reason}
                        </Typography>
                    </Box>
                )}

                <RelatedViolationsList
                    list={extendedProps.related_violations}
                    note={extendedProps.notif_id ? "Linked once the student accepts." : null}
                />

                {isAccepted && attendance === "not_marked" ? (
                    <>
                        <Box>
                            <Label>Mark attendance</Label>
                            <Stack direction="row" sx={{ gap: 1.25 }}>
                                <AttendanceButton color="success" onClick={() => onMarkAttendance(extendedProps.appointment_id, "present")}>
                                    Present
                                </AttendanceButton>
                                <AttendanceButton color="error" onClick={() => onMarkAttendance(extendedProps.appointment_id, "absent")}>
                                    Absent
                                </AttendanceButton>
                            </Stack>
                        </Box>

                        <Divider />

                        <Stack direction={{ xs: "column-reverse", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1.25 }}>
                            <Button
                                variant="text"
                                startIcon={<XCircle size={16} />}
                                onClick={() => onCancel(extendedProps.appointment_id)}
                                sx={{ textTransform: "none", fontWeight: 600, color: "var(--tone-red-fg)", borderRadius: 2, "&:hover": { bgcolor: "var(--tone-red-bg)" } }}
                            >
                                Cancel Appointment
                            </Button>
                            <Btn onclick={() => onReschedule(start, extendedProps.user, extendedProps.appointment_id)} label="Reschedule">
                                <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><CalendarClock size={16} /> Reschedule</Stack>
                            </Btn>
                        </Stack>
                    </>
                ) : note && (
                    <Alert severity={extendedProps.status === "rejected" || extendedProps.status === "cancelled" ? "warning" : "info"} sx={{ borderRadius: 2, fontSize: "0.82rem" }}>
                        {note}
                    </Alert>
                )}
            </Stack>
        </UpModal>
    )
}

export default AppointmentEventModal
