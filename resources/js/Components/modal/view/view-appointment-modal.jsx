import UpModal from "../up-modal"
import { AppointmentService } from "@/others/services/appointment-service"
import { readableDate, readableTime } from "@/others/function"
import { useEffect, useState } from "react"
import { Chip } from "@mui/material"
import { CalendarDays } from "lucide-react"

const ATTENDANCE_META = {
    present: { label: "Present", backgroundColor: "#dcfce7", color: "#15803d" },
    absent: { label: "Absent", backgroundColor: "#fee2e2", color: "#b91c1c" },
    not_marked: { label: "Attendance Not Marked", backgroundColor: "#f3f4f6", color: "#6b7280" },
}

// Read-only appointment details, fetched by the appointment's own id —
// deliberately separate from AppointmentEventModal (which needs a full
// FullCalendar event shape and carries admin-only cancel/reschedule/mark-
// attendance actions that don't belong in a plain "view" deep link).
const ViewAppointmentModal = ({ close, closeModal, id }) => {
    const [data, setData] = useState(null)

    useEffect(() => {
        if (close && id) {
            setData(null)
            AppointmentService.getAppointmentInfo(id, setData)
        }
    }, [close, id])

    if (!data) {
        return (
            <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} cntr={true} pd={["px-6", "py-6"]} bgColor="bg-white" w="w-[26rem]">
                <div className="h-24 animate-pulse bg-gray-100 rounded-md" />
            </UpModal>
        )
    }

    const isAccepted = data.appointment_status === "accepted"
    const attendance = data.attendance_status || "not_marked"
    const attendanceMeta = ATTENDANCE_META[attendance] || ATTENDANCE_META.not_marked
    const name = data.user?.profile
        ? `${data.user.profile.first_name ?? ""} ${data.user.profile.last_name ?? ""}`.trim()
        : "Appointment"

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} cntr={true} pd={["px-6", "py-6"]} bgColor="bg-white" w="w-[26rem]">
            <div className="grid gap-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-[1.1em] font-bold pr-6">{name}</h1>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isAccepted && (
                            <Chip
                                label={attendanceMeta.label}
                                size="small"
                                sx={{ fontWeight: 600, backgroundColor: attendanceMeta.backgroundColor, color: attendanceMeta.color }}
                            />
                        )}
                        <Chip
                            label={isAccepted ? "Accepted" : (data.appointment_status ?? "Pending")}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                textTransform: "capitalize",
                                backgroundColor: isAccepted ? "#dcfce7" : "#fef3c7",
                                color: isAccepted ? "#15803d" : "#b45309",
                            }}
                        />
                    </div>
                </div>

                <div className="text-[0.85em] text-gray-600 flex items-center gap-2">
                    <CalendarDays size="1em" />
                    {readableDate(data.date_time_appoint)} ({readableTime(data.date_time_appoint)})
                </div>

                {data.description && (
                    <div className="text-[0.85em] text-gray-700 bg-gray-50 rounded-md p-3">
                        {data.description}
                    </div>
                )}

                {data.rejected_reason && (
                    <div className="text-[0.85em] text-red-600">
                        Reason: {data.rejected_reason}
                    </div>
                )}
            </div>
        </UpModal>
    )
}

export default ViewAppointmentModal
