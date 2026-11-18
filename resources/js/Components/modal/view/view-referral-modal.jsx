import { ReferralService } from "@/others/services/referral-service"
import UpModal from "../up-modal"
import { useEffect, useState } from "react"
import { Box, Button, Stack, Typography } from "@mui/material"
import axios from "axios"
import { readableDate, readableTime, toTitleCase, showOutputModal } from "@/others/function"
import RichTextEditor from "@/Components/input/rich-text-editor"
import {
    ModalHeader, Section, Timeline, stepAt, stepAhead, PersonList, safeParseArray, People, prefectName, useOwnerTitle, useIsOwner, ViewModalSkeleton,
    TextBox, Field, Labeled, Text, EditedOn, RecordBody, SectionPair,
} from "./view-modal-parts"
import {
    MessageSquareText,
    History,
    Undo2,
    NotebookPen,
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
                <Body data={data} onSaved={setData} />
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

const Body = ({ data, onSaved = () => {} }) => {
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

                <People rows={[
                    {
                        label: `Referred Student${data.referralReferredStudent?.length > 1 ? `s (${data.referralReferredStudent.length})` : ""}`,
                        content: <PersonList
                            data={data.referredStudent}
                            data_list={data.referralReferredStudent != null ? data.referralReferredStudent : null}
                            emptyLabel="No referred student on record." />,
                    },
                    data.prefect && { label: "Filed by the Prefect", content: <Text>{prefectName(data.prefect)}</Text> },
                ]} />

                <Section icon={MessageSquareText} title="Reason for the Referral">
                    <TextBox>{data.reason_description}</TextBox>
                </Section>

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
