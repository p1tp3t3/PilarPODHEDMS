import AuthLayout from "@/Layouts/auth-layout"
import SetAppointmentReasonModal from "@/Components/modal/submission-form/set-appointment-reason-modal"
import ViewAppointmentModal from "@/Components/modal/view/view-appointment-modal"
import { useReload } from "@/context-provider/reload-provider"
import { AppointmentService } from "@/others/services/appointment-service"
import { showOutputModal, showWarningModal, readableDate, readableTime } from "@/others/function"
import { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"
import { Paper, Chip, Button } from "@mui/material"

const OtherAppointment = ({ user, appointment_history = [], call_in_history = [] }) => {
    const [reasonModalOpen, setReasonModalOpen] = useState(false)
    const [activeNotifId, setActiveNotifId] = useState(null)
    const [reasonData, setReasonData] = useState({ user_id: user.id, reason: "" })
    const [viewId, setViewId] = useState("")
    const [viewOpen, setViewOpen] = useState(false)

    const { loadRegister } = useReload()

    // Lets the "My Records This Semester" dashboard modal deep-link straight
    // to a specific confirmed appointment — independent of this page's own
    // history list, which is keyed by notification id, not Appointment id.
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("view")
        if (id) {
            setViewId(id)
            setViewOpen(true)
        }
    }, [])

    const respond = (id, action, reason = null) => {
        loadRegister(true, "text-wait", action === "accept" ? "Accepting Appointment..." : "Declining Appointment...")
        AppointmentService.respond(
            id, action, reason,
            () => {
                loadRegister(true, "")
                showOutputModal(
                    action === "accept" ? "Appointment Accepted Successfully" : "Appointment Declined Successfully",
                    "s",
                    () => {
                        loadRegister(false)
                        window.location.reload()
                    }
                )
            },
            () => {
                loadRegister(true, "")
                showOutputModal("Failed to Process. Please Try Again", "e", () => loadRegister(false))
            }
        )
    }

    const handleAccept = (item) => {
        showWarningModal(
            item.type === "sched" ? "Accept the Appointment?" : "Accept the Rescheduled Appointment?",
            "Accept",
            "Cancel",
            () => respond(item.id, "accept")
        )
    }

    const handleDeclineOpen = (item) => {
        setActiveNotifId(item.id)
        setReasonData({ user_id: user.id, reason: "" })
        setReasonModalOpen(true)
    }

    return (
        <>
            <Head title="My Appointments" />

            <ViewAppointmentModal close={viewOpen} closeModal={setViewOpen} id={viewId} />

            <SetAppointmentReasonModal
                close={reasonModalOpen}
                closeModal={setReasonModalOpen}
                pd={["px-8", "py-6"]}
                isEnableOuterClose={true}
                data={reasonData}
                setData={setReasonData}
                decline_title="Are You Sure You Want to Decline the Appointment?"
                decline_btn="Decline Appointment"
                sendData={() => {
                    setReasonModalOpen(false)
                    respond(activeNotifId, "decline", reasonData.reason)
                }}
            />

            <div className="w-full py-4 grid gap-6">
                <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">MY APPOINTMENTS</h1>

                <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: "0.5rem" }}>
                    <h2 className="text-[1.1em] font-bold mb-4">Appointment History</h2>
                    {appointment_history.length === 0 ? (
                        <p className="text-[0.85em] text-gray-500">No appointments sent to you yet.</p>
                    ) : (
                        <div className="grid gap-3">
                            {appointment_history.map((item) => (
                                <AppointmentRow
                                    key={item.id}
                                    item={item}
                                    onAccept={() => handleAccept(item)}
                                    onDecline={() => handleDeclineOpen(item)}
                                />
                            ))}
                        </div>
                    )}
                </Paper>

                <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: "0.5rem" }}>
                    <h2 className="text-[1.1em] font-bold mb-4">Call-In History</h2>
                    {call_in_history.length === 0 ? (
                        <p className="text-[0.85em] text-gray-500">No call-ins sent to you yet.</p>
                    ) : (
                        <div className="grid gap-3">
                            {call_in_history.map((item) => (
                                <div key={item.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <p className="text-[0.85em] text-gray-700">{item.message}</p>
                                    <p className="text-[0.75em] text-gray-400 mt-1">
                                        {readableDate(item.created_at)} ({readableTime(item.created_at)})
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </Paper>
            </div>
        </>
    )
}

const AppointmentRow = ({ item, onAccept, onDecline }) => {
    const isPending = item.accept === null

    return (
        <div className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
                <p className="text-[0.9em] font-semibold">
                    {item.type === "resched" ? "Rescheduled Appointment" : "Appointment"} — {item.date_appoint} {item.time_appoint}
                </p>
                {item.reason && <p className="text-[0.8em] text-gray-500 italic">{item.reason}</p>}
            </div>

            {isPending ? (
                <div className="flex gap-2">
                    <Button
                        size="small"
                        variant="contained"
                        onClick={onAccept}
                        sx={{ textTransform: "none", backgroundColor: "#16a34a", "&:hover": { backgroundColor: "#15803d" } }}
                    >
                        Accept
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={onDecline}
                        sx={{ textTransform: "none", backgroundColor: "#dc2626", "&:hover": { backgroundColor: "#b91c1c" } }}
                    >
                        Decline
                    </Button>
                </div>
            ) : (
                <Chip
                    label={item.accept ? "Accepted" : "Declined"}
                    size="small"
                    sx={{
                        fontWeight: 600,
                        backgroundColor: item.accept ? "#dcfce7" : "#fee2e2",
                        color: item.accept ? "#15803d" : "#b91c1c",
                    }}
                />
            )}
        </div>
    )
}

OtherAppointment.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default OtherAppointment
