import AuthLayout from "@/Layouts/auth-layout"
import SetAppointmentReasonModal from "@/Components/modal/submission-form/set-appointment-reason-modal"
import ViewAppointmentModal from "@/Components/modal/view/view-appointment-modal"
import { useReload } from "@/context-provider/reload-provider"
import { AppointmentService } from "@/others/services/appointment-service"
import { showOutputModal, showWarningModal, readableDate, readableTime } from "@/others/function"
import { useState, useEffect } from "react"
import { Head, usePage, router } from "@inertiajs/react"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import { Paper, Chip, Button, Box } from "@mui/material"
import { DataGrid } from "@/Components/other/data-grid"
import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import { CalendarDays, PhoneCall } from "lucide-react"

const OtherAppointment = ({ appointment_history = [], call_in_history = [], ...props }) => {
    // The controller doesn't pass `user` — fall back to the signed-in user.
    const user = props.user ?? usePage().props.auth.user
    const [reasonModalOpen, setReasonModalOpen] = useState(false)
    const [activeNotifId, setActiveNotifId] = useState(null)
    const [reasonData, setReasonData] = useState({ user_id: user.id, reason: "" })
    const [viewId, setViewId] = useState("")
    const [viewOpen, setViewOpen] = useState(false)

    const { loadRegister } = useReload()

    // Appointments waiting for an answer first, then the rest (newest first).
    const appointments = [...appointment_history].sort((a, b) => (a.accept === null ? 0 : 1) - (b.accept === null ? 0 : 1))
    const pendingCount = appointment_history.filter((a) => a.accept === null).length
    const [tab, setTab] = useState("appointments")

    // School year / semester, kept in the URL; changing one reloads only the two lists.
    const url = new URLSearchParams(window.location.search)
    const schoolYear = url.get("school-year") || "all"
    const semester = url.get("semester") || "all"
    const applyFilter = (patch) => {
        const next = { "school-year": schoolYear, semester, ...patch }
        const query = Object.fromEntries(Object.entries(next).filter(([, v]) => v && v !== "all"))
        router.get(window.location.pathname, query, {
            preserveState: true,
            preserveScroll: true,
            only: ["appointment_history", "call_in_history"],
        })
    }
    const tabs = [
        { key: "appointments", label: "Appointments", icon: CalendarDays },
        { key: "call-ins", label: "Call-Ins", icon: PhoneCall },
    ]

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

            <PageLayout title="MY APPOINTMENTS">
                <TabSwitcher tabs={tabs} value={tab} onChange={setTab} />

                {/* School year / semester: both tabs, by when it was sent. */}
                <div className="w-full flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    <MobileFilters active={countActive(schoolYear, semester)}>
                        <div className="w-full sm:w-48">
                            <DropdownField
                                default={{ val: "all", label: "All School Years" }}
                                list={(props.school_years ?? []).map((y) => ({ val: y, label: y }))}
                                val={schoolYear}
                                onChange={(e) => applyFilter({ "school-year": e.target.value })}
                                name="my_appointment_school_year"
                            />
                        </div>
                        <div className="w-full sm:w-44">
                            <DropdownField
                                default={{ val: "all", label: "All Semesters" }}
                                list={[{ val: 1, label: "1st Semester" }, { val: 2, label: "2nd Semester" }]}
                                val={semester === "all" ? "all" : Number(semester)}
                                onChange={(e) => applyFilter({ semester: e.target.value })}
                                name="my_appointment_semester"
                            />
                        </div>
                    </MobileFilters>
                </div>

                <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: "0.5rem" }}>
                    {tab === "appointments" && pendingCount > 0 && (
                        <p className="text-[0.8em] text-amber-700 mb-3">
                            {pendingCount} appointment{pendingCount > 1 ? "s" : ""} waiting for your response.
                        </p>
                    )}
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                        {tab === "appointments" ? (
                            <DataGrid
                                key="appointments"
                                rows={appointments.map((a, i) => ({ ...a, i: i + 1 }))}
                                columns={appointmentColumns(handleAccept, handleDeclineOpen)}
                                mobileSummary={(row) => ({
                                    name: row.appointment_number ? `Ref. No. ${row.appointment_number}` : "Appointment",
                                    role: `Sent ${readableDate(row.created_at)} (${readableTime(row.created_at)})`,
                                    hide: ["appointment_number", "created_at"],
                                })}
                                getRowHeight={() => "auto"}
                                disableRowSelectionOnClick
                                showToolbar
                                pagination
                                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                                pageSizeOptions={[10, 20, 50]}
                            />
                        ) : (
                            <DataGrid
                                key="call-ins"
                                rows={call_in_history.map((c, i) => ({ ...c, i: i + 1, text: plainText(c.message) }))}
                                columns={CALL_IN_COLUMNS}
                                mobileSummary={(row) => ({
                                    name: "Office call-in",
                                    role: `${readableDate(row.created_at)} (${readableTime(row.created_at)})`,
                                    hide: ["created_at"],
                                })}
                                getRowHeight={() => "auto"}
                                disableRowSelectionOnClick
                                showToolbar
                                pagination
                                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                                pageSizeOptions={[10, 20, 50]}
                            />
                        )}
                    </Box>
                </Paper>
            </PageLayout>
        </>
    )
}

// The call-in message is rich text (HTML from the editor); shown as plain text.
const plainText = (html) => {
    if (!html) return ""
    const el = document.createElement("div")
    el.innerHTML = html
    return (el.textContent || "").replace(/\s+/g, " ").trim()
}

// When it was sent: date over time.
const sentSinceColumn = {
    field: "created_at",
    headerName: "Sent Since",
    flex: 1,
    minWidth: 150,
    renderCell: ({ value }) => (
        <div className="leading-tight py-1">
            <div className="text-[0.85em]">{readableDate(value)}</div>
            <div className="text-[0.75em] text-gray-500">{readableTime(value)}</div>
        </div>
    ),
}

// Appointments table. Pending invitations get Accept / Decline; the rest a status chip.
const appointmentColumns = (onAccept, onDecline) => [
    { field: "i", headerName: "#", width: 55 },
    // A pending invitation gets its number once it's accepted.
    { field: "appointment_number", headerName: "Ref. No.", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "Not assigned yet" },
    sentSinceColumn,
    {
        field: "accept",
        headerName: "Status / Action",
        width: 190,
        sortable: false,
        valueGetter: (v) => (v === null || v === undefined ? "Pending" : v ? "Accepted" : "Declined"),
        renderCell: ({ row }) => (row.accept === null || row.accept === undefined ? (
            <div className="flex gap-2 py-1">
                <Button
                    size="small"
                    variant="contained"
                    disableElevation
                    onClick={() => onAccept(row)}
                    sx={{ textTransform: "none", backgroundColor: "#16a34a", "&:hover": { backgroundColor: "#15803d" } }}
                >
                    Accept
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onDecline(row)}
                    sx={{ textTransform: "none", color: "#dc2626", borderColor: "#fca5a5", "&:hover": { borderColor: "#dc2626", backgroundColor: "#fef2f2" } }}
                >
                    Decline
                </Button>
            </div>
        ) : (
            <Chip
                label={row.accept ? "Accepted" : "Declined"}
                size="small"
                sx={{ fontWeight: 600, backgroundColor: row.accept ? "#dcfce7" : "#fee2e2", color: row.accept ? "#15803d" : "#b91c1c" }}
            />
        )),
    },
]

// Call-ins table.
const CALL_IN_COLUMNS = [
    { field: "i", headerName: "#", width: 55 },
    { field: "text", headerName: "Message", flex: 1, minWidth: 260, valueGetter: (v) => v || "No message" },
    sentSinceColumn,
]

OtherAppointment.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default OtherAppointment
