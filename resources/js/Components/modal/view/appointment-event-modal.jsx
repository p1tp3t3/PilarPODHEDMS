import UpModal from "../up-modal"
import { Button, Chip } from "@mui/material"
import { appointmentStatusOf } from "@/others/appointment-status"
import { CalendarDays } from "lucide-react"


const AppointmentEventModal = ({ close, closeModal, event, onCancel, onReschedule, onMarkAttendance }) => {
    if (!event) {
        return <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} bgColor="bg-white" w="w-[26rem]" />
    }

    const { title, start, extendedProps } = event
    const isAccepted = extendedProps.status === "accepted"
    const statusMeta = appointmentStatusOf(extendedProps)
    const attendance = extendedProps.attendance_status || "not_marked"

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-6", "py-6"]} bgColor="bg-white" w="w-[26rem]">
            <div className="grid gap-4">
                <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-6">
                        <h1 className="text-[1.1em] font-bold">{title.replace(" (Pending)", "")}</h1>
                        {/* A pending invitation gets its number once it's accepted. */}
                        <p className="text-[0.8em] text-gray-500">
                            {extendedProps.appointment_number ? `Ref. No. ${extendedProps.appointment_number}` : "Ref. No. assigned once accepted"}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Chip
                            label={statusMeta.label}
                            size="small"
                            sx={{ fontWeight: 600, backgroundColor: statusMeta.bg, color: statusMeta.text }}
                        />
                    </div>
                </div>

                <div className="text-[0.85em] text-gray-600 flex items-center gap-2">
                    <CalendarDays size="1em" />
                    {start?.toLocaleString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                    })}
                </div>

                {(extendedProps.description || extendedProps.reason) && (
                    <div className="text-[0.85em] text-gray-700 bg-gray-50 rounded-md p-3">
                        {extendedProps.description || extendedProps.reason}
                    </div>
                )}

                {isAccepted ? (
                    attendance === "not_marked" ? (
                        <>
                            <div className="flex gap-2">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => onMarkAttendance(extendedProps.appointment_id, "present")}
                                    sx={{
                                        textTransform: "none",
                                        flex: 1,
                                        borderColor: "#16a34a",
                                        color: "#16a34a",
                                        "&:hover": { borderColor: "#15803d", backgroundColor: "#f0fdf4" },
                                    }}
                                >
                                    Student Present
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => onMarkAttendance(extendedProps.appointment_id, "absent")}
                                    sx={{
                                        textTransform: "none",
                                        flex: 1,
                                        borderColor: "#dc2626",
                                        color: "#dc2626",
                                        "&:hover": { borderColor: "#b91c1c", backgroundColor: "#fef2f2" },
                                    }}
                                >
                                    Student Absent
                                </Button>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => onReschedule(start, extendedProps.user, extendedProps.appointment_id)}
                                    sx={{ textTransform: "none", backgroundColor: "#2563eb", "&:hover": { backgroundColor: "#1d4ed8" } }}
                                >
                                    Reschedule
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => onCancel(extendedProps.appointment_id)}
                                    sx={{ textTransform: "none", backgroundColor: "#dc2626", "&:hover": { backgroundColor: "#b91c1c" } }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </>
                    ) : (
                        <p className="text-[0.8em] text-gray-500 italic">
                            Attendance has already been recorded for this appointment — it can no longer be rescheduled, cancelled, or re-marked.
                        </p>
                    )
                ) : extendedProps.status === "rejected" ? (
                    <p className="text-[0.8em] text-gray-500 italic">
                        This appointment was rejected.
                    </p>
                ) : extendedProps.status === "cancelled" ? (
                    <p className="text-[0.8em] text-gray-500 italic">
                        This appointment was cancelled.
                    </p>
                ) : (
                    <p className="text-[0.8em] text-gray-500 italic">
                        Waiting for the recipient to accept or decline this appointment.
                    </p>
                )}
            </div>
        </UpModal>
    )
}

export default AppointmentEventModal
