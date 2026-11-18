import UpModal from "../up-modal"
import { useState, useEffect } from "react"
import { Box, Stack } from "@mui/material"
import { readableDate, readableTime } from "../../../others/function"
import { AbsentFormService } from "@/others/services/absent-form-service"
import {
    ModalHeader, Section, Timeline, stepAt, stepAhead, safeParseArray, People, prefectName, useOwnerTitle, useIsOwner, ViewModalSkeleton,
    Pill, TextBox, Field, Labeled, Text, EditedOn, RecordBody, EvidenceGrid,
} from "./view-modal-parts"
import {
    Undo2,
    MessageSquareText,
    ImageIcon,
    History,
} from "lucide-react"

const statusFor = (data) => {
    if (data.revoked_at) return 'revoked'
    // Approved after a rejection counts as approved.
    if (data.confirmed_at) return 'approved'
    if (data.rejected_at) return 'rejected'
    return 'pending'
}

const ViewAbsentFormModal = (props) => {

    const [data, setData] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        // The previous record is cleared when it opens (skeleton until the new
        // one loads), not when it closes: clearing it then made the content
        // vanish mid-animation.
        if(props.close) {
            setData(null)
            setReload(true)
            getAbsentFormInfo()
        }
    }, [props.close])
    const getAbsentFormInfo = () => {
        AbsentFormService.getAbsentFormInfo(props.id, setData)
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
                <Body data={data} />
                :
                reload &&
                <ViewModalSkeleton variant="record" />}
            </Box>
        </UpModal>
    )
}

const when = (at) => `${readableDate(at)} (${readableTime(at)})`
// Absent-form evidence is images only.
const asImages = (list) => list.map((e) => ({ ...e, type: 'img' }))

// Every step an absent form goes through: Submitted -> Approved.
// A rejected one still shows "Approved" after it: the prefect can approve it
// later (e.g. once more evidence comes in). A revoke stops it.
const stepsFor = (d) => {
    const steps = [stepAt("Submitted", d.created_at, d.school_year_semester)]
    if (d.rejected_at) steps.push(stepAt("Rejected", d.rejected_at, d.rejected_school_year_semester, "failed", d.rejected_reason))
    if (d.confirmed_at) steps.push(stepAt("Approved", d.confirmed_at, d.confirmed_school_year_semester))
    else if (!d.revoked_at) steps.push(stepAhead("Approved", d.rejected_at ? "If the prefect reconsiders" : "Waiting for the prefect's review"))
    if (d.revoked_at) steps.push(stepAt("Revoked", d.revoked_at, d.revoked_school_year_semester, "stopped"))
    return steps
}

const Body = ({ data }) => {
    const status = statusFor(data)
    const reasons = safeParseArray(data.reason)
    const evidences = safeParseArray(data.evidences)
    const ownerId = data.user?.id ?? data.student_id
    const title = useOwnerTitle(ownerId, data.user?.profile?.first_name, "Absent Form")
    const isOwner = useIsOwner(ownerId)

    return (
        <Box>
            <ModalHeader
                title={title}
                reference={data.form_number}
                person={!isOwner ? data.user : null}
                personLabel="Submitted by"
                pdfUrl={data.pdf_url}
                status={status}
            />

            <RecordBody>
                {/* Progress: done steps and the ones still ahead */}
                <Timeline steps={stepsFor(data)} />


                {status === 'revoked' &&
                <Section icon={Undo2} title={isOwner ? "Revoked by You" : "Revoked by Student"}>
                    <Text>
                        The student withdrew this absent form. It is kept on record and remains visible here, but is no longer active.
                    </Text>
                </Section>}

                <People rows={[
                    { label: "Date of Absence", content: <Text>{readableDate(data.date_from)} to {readableDate(data.date_to)}</Text> },
                    data.prefect && { label: "Issued by the Prefect", content: <Text>{prefectName(data.prefect)}</Text> },
                ]} />

                <Section icon={MessageSquareText} title="Reason for Absence">
                    {reasons.length !== 0
                    ? <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                        {reasons.map((r, i) => <Pill key={i} label={r} sx={{ height: 26, fontWeight: 500 }} />)}
                      </Stack>
                    : <Text sx={{ color: "text.secondary" }}>No reason provided.</Text>}
                </Section>

                <Section icon={ImageIcon} title={`Evidence${evidences.length ? ` (${evidences.length})` : ''}`}>
                    {evidences.length !== 0
                    ? <EvidenceGrid files={asImages(evidences)} srcOf={(file) => `/absent-form/${data.encrypted_id}/evidence/${file}`} />
                    : <Text sx={{ color: "text.secondary" }}>No evidence included.</Text>}
                </Section>

                {data.note &&
                <Section icon={MessageSquareText} title="Note From the Prefect">
                    <TextBox>{data.note}</TextBox>
                </Section>}

                {data.edited_at && data.revisions?.length > 0 && (() => {
                    const previous = data.revisions[0]
                    const previousReasons = safeParseArray(previous.reason)
                    const previousEvidences = safeParseArray(previous.evidences)
                    return (
                        <Section icon={History} title="Previous Version (Before Edit)" tone="amber">
                            <Stack sx={{ gap: 1.5 }}>
                                <Field label="Date of Absent">{readableDate(previous.date_from)} to {readableDate(previous.date_to)}</Field>
                                <Labeled label="Reason">
                                    <TextBox tone="amber" height="auto" sx={{ color: "text.primary" }}>
                                        {previousReasons.map((r, i) => <div key={i}>- {r}</div>)}
                                    </TextBox>
                                </Labeled>
                                {previousEvidences.length !== 0 &&
                                <Labeled label="Evidence">
                                    <EvidenceGrid small files={asImages(previousEvidences)} label="Previous evidence"
                                        srcOf={(file) => `/absent-form/${data.encrypted_id}/previous-evidence/${file}`} />
                                </Labeled>}
                                <EditedOn>{when(data.edited_at)}</EditedOn>
                            </Stack>
                        </Section>
                    )
                })()}
            </RecordBody>
        </Box>
    )
}

ViewAbsentFormModal.Body = Body
export default ViewAbsentFormModal
