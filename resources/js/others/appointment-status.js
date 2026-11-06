// Appointment statuses on the prefect's calendar (the server sends each
// event's `display_status`; AppointmentController::CALENDAR_COLORS uses the
// same `color`s). `bg` / `text` style the status chip in the popups.
export const APPOINTMENT_STATUS = {
    pending: { label: "Pending", color: "#d97706", bg: "#fef3c7", text: "#b45309" },
    accepted: { label: "Accepted", color: "#16a34a", bg: "#dcfce7", text: "#15803d" },
    attended: { label: "Attended", color: "#2563eb", bg: "#dbeafe", text: "#1d4ed8" },
    absent: { label: "Absent", color: "#9333ea", bg: "#f3e8ff", text: "#7e22ce" },
    rejected: { label: "Rejected", color: "#dc2626", bg: "#fee2e2", text: "#b91c1c" },
    cancelled: { label: "Cancelled", color: "#64748b", bg: "#f1f5f9", text: "#475569" },
}

export const appointmentStatusOf = (extendedProps) =>
    APPOINTMENT_STATUS[extendedProps?.display_status] ?? APPOINTMENT_STATUS[extendedProps?.status] ?? APPOINTMENT_STATUS.pending
