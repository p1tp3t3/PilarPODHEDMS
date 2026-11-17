import { ReferralService } from "@/others/services/referral-service"
import UpModal from "../up-modal"
import { useEffect, useState } from "react"
import { Box, Stack } from "@mui/material"
import { readableDate, readableTime, toTitleCase } from "@/others/function"
import {
    ModalHeader, Section, Timeline, stepAt, stepAhead, PersonList, safeParseArray, People, prefectName, useOwnerTitle, useIsOwner, ViewModalSkeleton,
    TextBox, Field, Labeled, Text, EditedOn, RecordBody, SectionPair,
} from "./view-modal-parts"
import {
    MessageSquareText,
    History,
    Undo2,
} from "lucide-react"

const ViewReferralModal = (props) => {
    const [data, setData] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        if(props.close) {
            setReload(true)
            getReferralInfo()
        }else {
            setReload(false)
            setData(null)
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
                <Body data={data} />
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
    if (d.revoked_at) steps.push(stepAt("Revoked", d.revoked_at, d.revoked_school_year_semester, "stopped"))
    return steps
}

const Body = ({ data }) => {
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
