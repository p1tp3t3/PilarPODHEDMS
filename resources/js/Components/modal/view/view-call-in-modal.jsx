import { useState } from "react"
import axios from "axios"
import { usePage } from "@inertiajs/react"
import UpModal from "../up-modal"
import { readableDate, readableTime } from "@/others/function"
import { Box, Button, Stack, Typography } from "@mui/material"
import { Link2, MessageSquareText } from "lucide-react"
import { ModalHeader, Section, Pill, TextBox, RecordBody } from "./view-modal-parts"

// Whether the student came for the call-in (marked by the Prefect).
export const ATTENDANCE = {
    not_marked: { label: "Not Marked", tone: "gray" },
    present: { label: "Present", tone: "green" },
    absent: { label: "Absent", tone: "red" },
}

// The message may be saved editor HTML: shown as plain text (never as HTML).
const plain = (html) => {
    if (!html) return ""
    const doc = new DOMParser().parseFromString(String(html).replace(/<\/p>|<br\s*\/?>/gi, "\n"), "text/html")
    return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim()
}

// A small label with its value (and an optional second line) under it.
const Detail = ({ label, sub, children }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 0.25 }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "text.primary" }}>{children}</Typography>
        {sub && <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{sub}</Typography>}
    </Box>
)

/**
 * One call-in from the Call-In History (its row: student, called_by,
 * created_at, read_since, reason, related_violations, attendance_status,
 * call_in_key), laid out like the other record views. The Prefect marks
 * whether the student came (Present / Absent); onMarked(row) gets the
 * updated row. Only a call-in the student came to counts as an intervention.
 */
const ViewCallInModal = ({ close, closeModal, callIn, onMarked = () => {} }) => {
    const c = callIn
    const isPrefect = usePage().props.auth?.user?.role === "sub_admin"
    const [saving, setSaving] = useState(null)
    const [error, setError] = useState(null)
    const name = c?.student?.profile?.first_name ?? c?.student?.name?.split(" ")[0]
    const attendance = ATTENDANCE[c?.attendance_status ?? "not_marked"]
    const canMark = isPrefect && c?.call_in_key && (c.attendance_status ?? "not_marked") === "not_marked"

    const mark = (status) => {
        setSaving(status)
        setError(null)
        axios.post(`/prefect/call-in/${c.call_in_key}/attendance`, { status })
            .then((res) => onMarked({ ...c, attendance_status: res.data.attendance_status, attendance_marked_at: res.data.attendance_marked_at }))
            .catch((err) => setError(err?.response?.data?.message ?? "Could not save the attendance."))
            .finally(() => setSaving(null))
    }

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} cntr={true} pd={["p-0", ""]} bgColor="bg-white" w="w-[36rem] max-w-[90vw]">
            <Box sx={{ width: "100%" }}>
                {c && (
                    <>
                        <ModalHeader
                            title={name ? `${name}'s Call-In` : "Call-In"}
                            reference={c.call_in_number}
                            person={c.student ?? null}
                            personName={c.student ? null : "Deleted account"}
                            personLabel="Called in"
                            badge={<Pill tone={attendance.tone} label={attendance.label} />}
                        />
                        <RecordBody>
                            {/* The details in one light row (attendance: the header's pill). */}
                            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, px: 0.5 }}>
                                <Detail label="Called In By">{c.called_by ?? "N/A"}</Detail>
                                <Detail label="Date" sub={readableTime(c.created_at)}>{readableDate(c.created_at)}</Detail>
                                <Detail label="Seen" sub={c.read_since ? readableTime(c.read_since) : null}>
                                    {c.read_since ? readableDate(c.read_since) : "Not yet"}
                                </Detail>
                            </Box>

                            <Section icon={MessageSquareText} title="Message to the Student">
                                <TextBox height="auto" sx={{ maxHeight: 220, whiteSpace: "pre-line" }}>{plain(c.reason) || "No message."}</TextBox>
                            </Section>

                            <Section icon={Link2} title="Related Violation(s)">
                                {c.related_violations?.length
                                    ? <Stack direction="row" sx={{ gap: 0.75, flexWrap: "wrap" }}>
                                        {c.related_violations.map((v) => <Pill key={v.id} tone="blue" label={v.name} sx={{ height: 26, fontWeight: 500 }} />)}
                                      </Stack>
                                    : <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>None chosen</Typography>}
                            </Section>

                            {canMark && (
                                <Stack sx={{ gap: 1 }}>
                                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>Did the student come to the office?</Typography>
                                    <Stack direction="row" sx={{ gap: 1, justifyContent: "flex-end" }}>
                                        <Button variant="contained" color="error" disableElevation disabled={saving !== null}
                                            onClick={() => mark("absent")} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                                            {saving === "absent" ? "Saving..." : "Absent"}
                                        </Button>
                                        <Button variant="contained" color="success" disableElevation disabled={saving !== null}
                                            onClick={() => mark("present")} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                                            {saving === "present" ? "Saving..." : "Present"}
                                        </Button>
                                    </Stack>
                                    {error && <Typography sx={{ fontSize: "0.75rem", color: "error.main", textAlign: "right" }}>{error}</Typography>}
                                </Stack>
                            )}
                        </RecordBody>
                    </>
                )}
            </Box>
        </UpModal>
    )
}

export default ViewCallInModal
