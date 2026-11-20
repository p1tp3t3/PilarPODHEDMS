import { ReferralService } from "@/others/services/referral-service"
import UpModal from "../up-modal"
import { useEffect, useState } from "react"
import { Avatar, Box, Button, Stack, Typography } from "@mui/material"
import axios from "axios"
import { readableDate, readableTime, toTitleCase, showOutputModal, getProfilePic } from "@/others/function"
import RichTextEditor from "@/Components/input/rich-text-editor"
import {
    ModalHeader, Section, Timeline, stepAt, stepAhead, PersonList, safeParseArray, People, prefectName, useOwnerTitle, useIsOwner, ViewModalSkeleton,
    TextBox, Field, Labeled, Text, EditedOn, RecordBody, SectionPair, Pill,
} from "./view-modal-parts"
import RelatedViolationsField from "@/Components/input/related-violations-field"
import InterveneBtn from "@/Components/button/intervene-btn"
import {
    MessageSquareText,
    History,
    Undo2,
    NotebookPen,
    Link2,
    Users,
} from "lucide-react"

const ViewReferralModal = (props) => {
    const [data, setData] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        // The previous record is cleared when it opens (skeleton until the new
        // one loads), not when it closes: clearing it then made the content
        // vanish mid-animation.
        if(props.close) {
            setData(null)
            setReload(true)
            getReferralInfo()
        }
    }, [props.close])

    const getReferralInfo = () => {
        ReferralService.getReferralInfo(props.referralId, setData)
    }

    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={['p-0', '']}
            bgColor='bg-white'
            w='w-[42rem] max-w-[90vw]'>
            <Box sx={{ width: "100%" }}>
                {(data != null)
                ?
                <Body data={data} onSaved={setData} canIntervene={props.canIntervene ?? true} />
                :
                reload &&
                <ViewModalSkeleton variant="record" />}
            </Box>
        </UpModal>
    )
}

const when = (at) => `${readableDate(at)} (${readableTime(at)})`

// Every step a referral goes through: Reported -> Approved.
// A rejected one still shows the steps after it: the prefect can approve it
// later (e.g. once more evidence comes in). A revoke stops it.
const stepsFor = (d) => {
    const steps = [stepAt("Reported", d.created_at, d.school_year_semester)]
    if (d.rejected_at) steps.push(stepAt("Rejected", d.rejected_at, d.rejected_school_year_semester, "failed", d.rejected_reason))
    // Rejecting doesn't clear an earlier approval date, so while it's rejected
    // that date isn't an approval: show "Approved" as still possible.
    const rejectedNow = d.referral_status === "rejected"
    if (d.confirmed_at && !rejectedNow) steps.push(stepAt("Approved", d.confirmed_at, d.confirmed_school_year_semester))
    else if (!d.revoked_at) steps.push(stepAhead("Approved", d.rejected_at ? "If the prefect reconsiders" : "Waiting for the prefect's review"))
    if (d.revoked_at) return [...steps, stepAt("Revoked", d.revoked_at, d.revoked_school_year_semester, "stopped")]
    // Sent on to an office (Guidance / IT Staff), then that office's note.
    if (d.sent_at) {
        steps.push(stepAt(`Sent to ${d.sent_to}`, d.sent_at))
        steps.push(d.office_note_at ? stepAt("Noted", d.office_note_at) : stepAhead("Noted", `Waiting for ${d.sent_to}'s note`))
    }
    return steps
}

// The note from the office the referral was sent to. That office writes it
// here once (a saved note is final); everyone who can open the referral
// reads it.
const OfficeNote = ({ data, onSaved }) => {
    const [note, setNote] = useState("")
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)
    const canWrite = !!data.can_write_office_note
    const office = data.sent_to

    if (!data.sent_at && !data.office_note) return null
    if (!canWrite && !data.office_note) return null

    const author = [data.officeNoteBy?.profile?.first_name, data.officeNoteBy?.profile?.last_name].filter(Boolean).join(" ")
    const save = () => {
        if (!note || !note.replace(/<[^>]*>/g, "").trim()) { setError("Please write a note."); return }
        setSaving(true)
        setError(null)
        axios.post(`/referral/${data.encrypted_id}/office-note`, { note })
            .then(({ data: fresh }) => onSaved(fresh?.data ?? fresh))
            .catch((e) => {
                const msg = e?.response?.data?.errors?.note?.[0] ?? e?.response?.data?.message ?? "The note couldn't be saved. Please try again."
                setError(msg)
                if (!e?.response?.data?.errors) showOutputModal(msg, "e")
            })
            .finally(() => setSaving(false))
    }

    const writing = canWrite && !data.office_note
    return (
        <Section icon={NotebookPen} title={`Note from ${office ?? "the Office"}`}>
            {writing ? (
                <Stack sx={{ gap: 1.5 }}>
                    <RichTextEditor
                        val={note}
                        change={(v) => { setNote(v); setError(null) }}
                        error={error}
                        placeholder={`Write ${office ?? "your office"}'s note on this referral…`}
                        minHeight="9rem"
                    />
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Once saved, the note can't be changed.</Typography>
                        <Button variant="contained" disableElevation size="small" onClick={save} disabled={saving} sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px" }}>
                            {saving ? "Saving…" : "Save Note"}
                        </Button>
                    </Stack>
                </Stack>
            ) : (
                <Stack sx={{ gap: 1 }}>
                    <TextBox html={data.office_note} height="auto" sx={{ minHeight: 64 }} />
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                        {author ? `${author} · ` : ""}{data.office_note_at ? when(data.office_note_at) : ""}
                    </Typography>
                </Stack>
            )}
        </Section>
    )
}

// The violation(s) the referral addresses, per referred student (each is
// referred about their own violations): the Prefect sets them; others see
// them. Once approved, the referral counts as an intervention for each
// student's own linked violations in the early-intervention predictor.
const studentsOf = (data) => {
    const list = (data.referralReferredStudent ?? []).filter((s) => s.student_id)
    if (list.length) return list.map((s) => ({ id: s.student_id, user: s.user }))
    return data.referredStudent?.id ? [{ id: data.referredStudent.id, user: data.referredStudent }] : []
}
const nameOf = (u) => [u?.profile?.first_name, u?.profile?.last_name].filter(Boolean).join(" ") || "Student"
const idsOf = (byStudent, students) => Object.fromEntries(students.map((s) => [s.id, (byStudent?.[s.id] ?? []).map((v) => v.id)]))
const sameIds = (a = [], b = []) => a.slice().sort().join(",") === b.slice().sort().join(",")

// One student's row: their photo and name, then their violations.
// `action`: a button at the right of the name (Intervene).
const StudentRow = ({ student, children, first, action }) => (
    <Box sx={{ pt: first ? 0 : 1.75, mt: first ? 0 : 1.75, borderTop: first ? 0 : 1, borderColor: "divider", minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 1 }}>
            <Avatar src={getProfilePic(student.user?.profile?.profile_picture, student.user?.profile?.sex)} alt="" sx={{ width: 26, height: 26 }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "text.primary", flex: 1, minWidth: 0 }}>{nameOf(student.user)}</Typography>
            {action}
        </Stack>
        {children}
    </Box>
)

// canIntervene=false: no Intervene buttons (e.g. opened from the
// Interventions page, where the student already has this intervention).
const RelatedViolations = ({ data, canIntervene = true }) => {
    const students = studentsOf(data)
    const [saved, setSaved] = useState(data.related_violations_by_student ?? {})
    const [ids, setIds] = useState(() => idsOf(data.related_violations_by_student, students))
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)
    const savedIds = idsOf(saved, students)
    const dirty = students.some((s) => !sameIds(ids[s.id], savedIds[s.id]))

    // Read only (not the Prefect, or no longer pending: already intervened):
    // only the students it was about, with their related violation(s);
    // nothing when none were chosen.
    if (!data.can_set_related_violations) {
        const withLinks = students.filter((s) => (saved[s.id] ?? []).length)
        if (withLinks.length === 0) return null
        return (
            <Section icon={Link2} title="Related Violation(s)">
                {withLinks.map((s, i) => (
                    <StudentRow key={s.id} student={s} first={i === 0}>
                        <Stack direction="row" sx={{ gap: 0.75, flexWrap: "wrap" }}>
                            {saved[s.id].map((v) => <Pill key={v.id} tone="blue" label={v.name} sx={{ height: 26, fontWeight: 500 }} />)}
                        </Stack>
                    </StudentRow>
                ))}
            </Section>
        )
    }
    const save = () => {
        setSaving(true)
        setMessage(null)
        axios.post(`/prefect/referral/${data.encrypted_id}/related-violations`, { related_violations: ids })
            .then((res) => {
                const byStudent = res.data?.related_violations_by_student ?? {}
                setSaved(byStudent)
                setIds(idsOf(byStudent, students))
                setMessage({ ok: true, text: "Saved." })
            })
            .catch((err) => setMessage({ ok: false, text: err?.response?.data?.message ?? "Could not save." }))
            .finally(() => setSaving(false))
    }
    return (
        <Section icon={Link2} title="Related Violation(s)">
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 1.5 }}>
                {students.length > 1
                    ? "Choose the violation(s) each student is being referred for. Leave a student blank if the referral is not about one of their violations. Once the referral is approved, it is recorded as help given to that student for those violations."
                    : "Choose the violation(s) the student is being referred for. Leave it blank if the referral is not about one of their violations. Once the referral is approved, it is recorded as help given to the student for those violations."}
            </Typography>
            {students.map((s, i) => (
                <StudentRow key={s.id} student={s} first={i === 0}
                    // Set an appointment with this student about their chosen violation(s).
                    action={canIntervene && <InterveneBtn
                        student={{ ...s.user, id: s.id }}
                        violationIds={ids[s.id] ?? []}
                        reason={`<p>Consultation with the Prefect of Discipline regarding referral #${data.referral_number}.</p>`}
                    />}>
                    <RelatedViolationsField
                        studentIds={[s.id]}
                        helper={false}
                        value={ids[s.id] ?? []}
                        onChange={(v) => { setIds((prev) => ({ ...prev, [s.id]: v })); setMessage(null) }}
                    />
                </StudentRow>
            ))}
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 1, mt: 1.5 }}>
                {message && <Typography sx={{ fontSize: "0.75rem", color: message.ok ? "success.main" : "error.main" }}>{message.text}</Typography>}
                <Button size="small" variant="contained" disableElevation disabled={!dirty || saving} onClick={save}
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </Stack>
        </Section>
    )
}

const Body = ({ data, onSaved = () => {}, canIntervene = true }) => {
    const referrerName = toTitleCase(data.user?.profile?.first_name)
    const ownerId = data.user?.id ?? data.referrer_id
    const title = useOwnerTitle(ownerId, referrerName, "Referral", "Referrer")
    const isOwner = useIsOwner(ownerId)

    return (
        <Box>
            <ModalHeader
                title={title}
                reference={data.referral_number}
                person={!isOwner ? data.user : null}
                pdfUrl={data.pdf_url}
                status={data.referral_status}
            />

            <RecordBody>
                {/* Progress: done steps and the ones still ahead */}
                <Timeline steps={stepsFor(data)} />


                {data.referral_status === 'revoked' &&
                <Section icon={Undo2} title={isOwner ? "Revoked by You" : "Revoked by Referrer"}>
                    <Text>
                        The referrer withdrew this referral. It is kept on record and remains visible here, but is no longer active.
                    </Text>
                </Section>}

                <Section icon={Users} title={`Referred Student${data.referralReferredStudent?.length > 1 ? `s (${data.referralReferredStudent.length})` : ""}`}>
                    <PersonList
                        data={data.referredStudent}
                        data_list={data.referralReferredStudent != null ? data.referralReferredStudent : null}
                        emptyLabel="No referred student on record." />
                </Section>

                {data.prefect && <People rows={[
                    { label: "Filed by the Prefect", content: <Text>{prefectName(data.prefect)}</Text> },
                ]} />}

                <Section icon={MessageSquareText} title="Reason for the Referral">
                    <TextBox>{data.reason_description}</TextBox>
                </Section>

                <RelatedViolations key={`rv-${data.encrypted_id}`} data={data} canIntervene={canIntervene} />

                {/* key: a fresh editor state for each record */}
                <OfficeNote key={data.encrypted_id} data={data} onSaved={onSaved} />

                {data.edited_at && data.revisions?.length > 0 && (() => {
                    const previous = data.revisions[0]
                    const previousStudents = safeParseArray(previous.students)
                    return (
                        <Section icon={History} title="Previous Version (Before Edit)" tone="amber">
                            <Stack sx={{ gap: 1.5 }}>
                                <Field label="Referred Student(s)">
                                    {previousStudents.length !== 0
                                        ? previousStudents.map((s) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()).filter(Boolean).join(', ')
                                        : '—'}
                                </Field>
                                <Labeled label="Reason">
                                    <TextBox tone="amber" height={96} sx={{ color: "text.primary" }}>{previous.reason_description}</TextBox>
                                </Labeled>
                                <EditedOn>{when(data.edited_at)}</EditedOn>
                            </Stack>
                        </Section>
                    )
                })()}
            </RecordBody>
        </Box>
    )
}

ViewReferralModal.Body = Body
export default ViewReferralModal
