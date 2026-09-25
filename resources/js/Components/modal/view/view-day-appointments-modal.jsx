import UpModal from "../up-modal"
import { useEffect, useState } from "react"
import axios from "axios"
import { Chip, CircularProgress } from "@mui/material"
import { CalendarPlus, ChevronRight } from "lucide-react"

const ATTENDANCE_META = {
    present: { label: "Present", backgroundColor: "#dcfce7", color: "#15803d" },
    absent: { label: "Absent", backgroundColor: "#fee2e2", color: "#b91c1c" },
}

// `.toISOString()` converts to UTC first, which rolls the date backward a
// day for any positive UTC offset (e.g. Asia/Manila, UTC+8) — a local
// midnight date becomes the previous day once converted. Build the
// YYYY-MM-DD string from the local date parts instead.
const toLocalDateStr = (d) => {
    const date = new Date(d)
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0")
}

// Lists every appointment (accepted + pending) already scheduled on a given
// day — a single day can have 2+ students scheduled, and the calendar cell
// only shows up to 3 before collapsing into "+more", so this gives a full
// view anchored off the "View Appointments" option in the day-click menu.
const ViewDayAppointmentsModal = ({ close, closeModal, date, onSelectEvent, onScheduleNew }) => {
    const [loading, setLoading] = useState(false)
    const [events, setEvents] = useState([])

    const isPast = (() => {
        if (!date) return false
        const day = new Date(date)
        day.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return day < today
    })()

    useEffect(() => {
        if (!close || !date) return

        setLoading(true)
        const dateStr = toLocalDateStr(date)
        axios
            .get("/calendar/appointment/events", { params: { start: dateStr, end: dateStr } })
            .then((res) => setEvents(res.data || []))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false))
    }, [close, date])

    const handleClick = (item) => {
        closeModal(false)
        onSelectEvent({
            title: item.title,
            start: new Date(item.start),
            extendedProps: item.extendedProps,
        })
    }

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-7", "py-7"]} bgColor="bg-white" w="w-[34rem]">
            <div className="grid gap-4">
                <h1 className="text-[1.1em] font-bold pr-6">
                    Appointments for {date ? new Date(date).toDateString() : ""}
                </h1>

                {loading ? (
                    <div className="flex justify-center py-6"><CircularProgress size={22} /></div>
                ) : events.length === 0 ? (
                    <p className="text-[0.85em] text-gray-500 italic text-center py-4">No appointments scheduled for this day.</p>
                ) : (
                    <div className="grid gap-2 max-h-[28rem] overflow-y-auto">
                        {events.map((item) => {
                            const isAccepted = item.extendedProps?.status === "accepted"
                            const attendanceMeta = ATTENDANCE_META[item.extendedProps?.attendance_status]
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleClick(item)}
                                    className="flex items-center justify-between text-left border rounded-md px-3 py-2 hover:bg-gray-50 transition"
                                >
                                    <div>
                                        <div className="text-[0.85em] font-medium">{item.title.replace(" (Pending)", "")}</div>
                                        <div className="text-[0.75em] text-gray-500">
                                            {new Date(item.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {attendanceMeta && (
                                            <Chip
                                                label={attendanceMeta.label}
                                                size="small"
                                                sx={{ fontWeight: 600, backgroundColor: attendanceMeta.backgroundColor, color: attendanceMeta.color }}
                                            />
                                        )}
                                        <Chip
                                            label={isAccepted ? "Accepted" : "Pending"}
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                backgroundColor: isAccepted ? "#dcfce7" : "#fef3c7",
                                                color: isAccepted ? "#15803d" : "#b45309",
                                            }}
                                        />
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                <button
                    onClick={() => { closeModal(false); onScheduleNew(date) }}
                    disabled={isPast}
                    className="flex items-center justify-center gap-2 text-[0.85em] font-medium text-blue-600 border border-blue-200 rounded-md py-2 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    title={isPast ? "Can't schedule an appointment for a past date." : undefined}
                >
                    <CalendarPlus size={16} /> Schedule New Appointment
                </button>
            </div>
        </UpModal>
    )
}

export default ViewDayAppointmentsModal
