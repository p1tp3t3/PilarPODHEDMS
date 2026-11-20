import UpModal from "../up-modal"
import { useState, useEffect } from "react"
import { usePage } from "@inertiajs/react"
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material"
import { readableDate, readableTime, toTitleCase, getProfilePic } from "../../../others/function"
import { ComplaintService } from "@/others/services/complaint-service"
import {
    ModalHeader, Section, Timeline, stepAt, stepAhead, PersonList, safeParseArray, People, prefectName, useOwnerTitle, useIsOwner, ViewModalSkeleton,
    Pill, TextBox, Text, Field, EvidenceGrid, EmptyNote,
} from "./view-modal-parts"
import {
    AlertCircle,
    CheckCircle2,
    MessageSquareText,
    ImageIcon,
    Sparkles,
    ClipboardList,
    Undo2,
    FileText,
    History,
    ShieldAlert,
    Gavel,
    Repeat,
    Users,
} from "lucide-react"
import InterveneBtn from "@/Components/button/intervene-btn"

const ViewComplaintModal = (props) => {
    const [data, setData] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        // The previous record is cleared when it opens (skeleton until the new
        // one loads), not when it closes: clearing it then made the content
        // vanish mid-animation.
        if (props.close) {
            setData(null)
            setReload(true)
            getComplaintInfo()
        }
    }, [props.close])

    const getComplaintInfo = () => {
        ComplaintService.getComplaintInfo(props.complainant, setData)
    }

    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={['p-0', '']}
            bgColor='bg-white'
            w='w-[55rem] max-w-[90vw]'>
            <Box sx={{ width: "100%" }}>
                {(data != null)
                ?
                <Body data={data} usr={props.usr} />
                :
                reload &&
                <ViewModalSkeleton variant="record" />}
            </Box>
        </UpModal>
    )
}

// Mirrors complaint_context_analyzer.py's _status() thresholds exactly —
// cosine similarity between averaged Word2Vec vectors never approaches 1.0
// the way raw-text similarity would, so these bands are calibrated to the
// 0-0.6-ish range that method actually produces, not literal-text-match
// scores.
const MATCH_LEVELS = [
    { label: 'Very Strong Match', min: 0.50, tone: 'green' },
    { label: 'Strong Match', min: 0.40, tone: 'yellow' },
    { label: 'Likely Related', min: 0.30, tone: 'orange' },
    { label: 'Possibly Related', min: 0.20, tone: 'red' },
    { label: 'Unclear / Needs Review', min: -Infinity, tone: 'gray' },
]

const matchLevelFor = (similarity) => MATCH_LEVELS.find(l => similarity >= l.min)

const when = (at) => `${readableDate(at)} (${readableTime(at)})`

// Every step a complaint goes through: Reported -> Approved -> Resolved.
// A rejected one still shows the steps after it: the prefect can approve it
// later (e.g. once more evidence comes in). A revoke stops it.
const stepsFor = (d) => {
    const steps = [stepAt("Reported", d.created_at, d.school_year_semester)]
    // Rejected, then edited and resubmitted: that rejection (kept on the
    // version that got it) and the resubmission.
    const earlier = (d.revisions ?? []).find((r) => r.rejected_at)
    if (earlier) steps.push(stepAt("Rejected", earlier.rejected_at, null, "failed", earlier.rejected_reason))
    if (d.resubmitted_at) steps.push(stepAt("Resubmitted", d.resubmitted_at, null))
    if (d.rejected_at) steps.push(stepAt("Rejected", d.rejected_at, d.rejected_school_year_semester, "failed", d.rejected_reason))
    // Rejecting doesn't clear an earlier approval date, so while it's rejected
    // that date isn't an approval: show "Approved" as still possible.
    // Pending (e.g. resubmitted) is waiting for the prefect: an earlier
    // approval date isn't an approval now either.
    const rejectedNow = d.complaint_status === "rejected" || d.complaint_status === "pending"
    if (d.confirmed_at && !rejectedNow) steps.push(stepAt("Approved", d.confirmed_at, d.confirmed_school_year_semester))
    else if (!d.revoked_at) steps.push(stepAhead("Approved", d.rejected_at ? "If the prefect reconsiders" : "Waiting for the prefect's review"))
    if (d.offense_issued_at) steps.push(stepAt("Resolved", d.offense_issued_at, d.resolved_school_year_semester))
    else if (!d.revoked_at) steps.push(stepAhead("Resolved", "Once the case is settled"))
    if (d.revoked_at) steps.push(stepAt("Revoked", d.revoked_at, d.revoked_school_year_semester, "stopped"))
    return steps
}

const Body = ({ data, usr }) => {
    const isPrefect = usePage().props.auth?.user?.role === 'sub_admin'
    // No violation verdict yet (InterveneBtn shows for the Prefect only).
    const beforeVerdict = ["pending", "ongoing"].includes(data.complaint_status)
    const evidences = safeParseArray(data.complaint_evidences)
    const contextAnalysis = safeParseArray(data.context_analysis)
    const complainantName = toTitleCase(data.user != null ? data.user.profile?.first_name : data.complainant_name)
    const ownerId = data.complainant_id ?? data.user?.id
    const title = useOwnerTitle(ownerId, complainantName, "Complaint", "Complainant")
    const isOwner = useIsOwner(ownerId)

    return (
        <Box>
            <ModalHeader
                title={title}
                reference={data.complaint_number}
                // Who filed it (not repeated when it's the viewer's own).
                person={!isOwner ? data.user : null}
                personName={!isOwner && data.user == null ? toTitleCase(data.complainant_name) : null}
                pdfUrl={data.pdf_url}
                status={data.complaint_status}
            />

            <Stack sx={{ p: 3, gap: 2 }}>
                {/* Progress: done steps and the ones still ahead */}
                <Timeline steps={stepsFor(data)} />

                {/* Every earlier version, newest first (the audit trail): each one
                    as it was, with its evidence (kept in previous_evidences/) and,
                    when it was rejected and then resubmitted, why. */}
                {(data.revisions ?? []).map((previous, idx, all) => {
                    const previousSubjects = safeParseArray(previous.subjects)
                    const previousEvidences = safeParseArray(previous.complaint_evidences)
                    const label = `Previous Version ${all.length - idx}`
                    return (
                        <Section key={previous.id ?? idx} icon={History} title={previous.rejected_at ? `${label} (Rejected, Before Resubmitting)` : `${label} (Before Edit)`} tone="amber">
                            <Stack sx={{ gap: 1.5 }}>
                                {previous.rejected_at && <Field label="Rejected because">{previous.rejected_reason || "No reason given"}</Field>}
                                <Field label="Incident">{previous.incident ? toTitleCase(previous.incident) : '—'}</Field>
                                <Field label="Subject(s)">
                                    {previousSubjects.length !== 0
                                        ? previousSubjects.map((s) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()).filter(Boolean).join(', ')
                                        : '—'}
                                </Field>
                                <Box>
                                    <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mb: 0.5 }}>Reason:</Typography>
                                    <TextBox html={previous.complaint_description} tone="amber" height={96} sx={{ color: "text.primary" }} />
                                </Box>
                                {previousEvidences.length !== 0 &&
                                <Box>
                                    <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mb: 0.5 }}>Evidence:</Typography>
                                    <EvidenceGrid small files={previousEvidences} label="Previous evidence"
                                        srcOf={(file) => `/complaint/${data.encrypted_id}/previous-evidence/${file}`} />
                                </Box>}
                                <Typography sx={{ fontSize: "0.75em", color: "text.disabled" }}>
                                    {previous.rejected_at ? "Resubmitted" : "Edited"} on {when(previous.created_at)}
                                </Typography>
                            </Stack>
                        </Section>
                    )
                })}


                {data.complaint_status === 'revoked' &&
                <Section icon={Undo2} title={isOwner ? "Revoked by You" : "Revoked by Complainant"}>
                    <Typography sx={{ fontSize: "0.875rem", color: "text.primary" }}>
                        The complainant withdrew this complaint. It is kept on record and remains visible here, but is no longer active.
                    </Typography>
                </Section>}

                <Section icon={Users} title={`Subject${data.complaintSubject?.length > 1 ? `s (${data.complaintSubject.length})` : ""}`}>
                    <PersonList
                        data={data.subject}
                        data_list={data.complaintSubject != null ? data.complaintSubject : null}
                        emptyLabel="No subject on record."
                        // Student data privacy: only the prefect can open a subject's profile.
                        linkable={isPrefect}
                        // Before the verdict (pending / ongoing): the Prefect can
                        // already set an appointment with the student.
                        action={beforeVerdict ? (u) => u?.role === "student" && (
                            <InterveneBtn
                                student={u}
                                violationIds={data.violation?.id ? [data.violation.id] : []}
                                reason={`<p>Consultation with the Prefect of Discipline regarding complaint #${data.complaint_number}.</p>`}
                                // Kept on the appointment: a Complaint intervention.
                                extraPayload={{ complaint_id: data.encrypted_id }}
                            />
                        ) : undefined} />
                </Section>

                {data.prefect && <People rows={[
                    { label: "Filed by the Prefect", content: <Text>{prefectName(data.prefect)}</Text> },
                ]} />}

                <Section icon={ClipboardList} title="Incident Reported">
                    <Typography sx={{ fontSize: "0.875rem", color: "text.primary" }}>{toTitleCase(data.violation?.violation_name)}</Typography>
                    {data.violation?.keywords?.length > 0 && (
                        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                            {data.violation.keywords.map((kw, i) => <Pill key={i} label={kw} bordered={false} sx={{ bgcolor: "action.selected", fontWeight: 400 }} />)}
                        </Stack>
                    )}
                </Section>

                <Section icon={MessageSquareText} title={isOwner ? "Your Reason" : "Reason by the Complainant"}>
                    <TextBox html={data.complaint_description} />
                </Section>

                {usr.role === "sub_admin" &&
                <Section icon={Sparkles} title="Context of the Complainant's Reason">
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
                        {MATCH_LEVELS.map((l, i) => <Pill key={i} tone={l.tone} label={l.label} sx={{ fontSize: "0.7rem" }} />)}
                    </Stack>
                    {contextAnalysis.length !== 0
                    ? <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, p: 1.5, borderRadius: 1.5, bgcolor: "action.hover" }}>
                        {contextAnalysis.map((e, i) => (
                            <Pill key={i} tone={matchLevelFor(e.similarity).tone} label={e.violation} sx={{ height: 26, fontWeight: 500 }} />
                        ))}
                      </Stack>
                    : <EmptyNote icon={AlertCircle} text="No Context Analyzed" />}
                </Section>}

                <Section icon={ImageIcon} title={`Additional Evidences${evidences.length ? ` (${evidences.length})` : ''}`}>
                    {evidences.length !== 0
                    ? <EvidenceGrid files={evidences} srcOf={(file) => `/complaint/${data.encrypted_id}/evidence/${file}`} />
                    : <EmptyNote icon={AlertCircle} text="No Evidences Included" />}
                </Section>

                {data.complaint_status === "resolved" && (() => {
                    const summary = data.incident_summary || data.complaintSubject?.find(s => s.incident_summary)?.incident_summary
                    return summary &&
                        <Section icon={FileText} title="Summary About the Incident">
                            <TextBox sx={{ color: "text.primary" }}>{summary}</TextBox>
                        </Section>
                })()}

                {/* Subjects' violations: prefect only (student data privacy). */}
                {isPrefect && data.complaint_status === "resolved" && data.complaintSubject?.length > 0 &&
                <Section icon={ShieldAlert} title="Violations Committed">
                    <Stack sx={{ gap: 2 }}>
                        {data.complaintSubject.map((sub, i) => (
                            <SubjectViolations key={i} sub={sub} found={(data.complaintSubjectViolation || []).filter(v => v.student_id === sub.student_id)} />
                        ))}
                    </Stack>
                </Section>}
            </Stack>
        </Box>
    )
}

// One subject of a resolved complaint and the violations issued to them.
const SubjectViolations = ({ sub, found }) => {
    const p = sub.user?.profile
    const violations = found.filter(v => v.violation)
    const cleared = found.length > 0 && violations.length === 0

    return (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, px: { xs: 1.5, sm: 2 }, py: 1.25, bgcolor: "action.hover", borderBottom: 1, borderColor: "divider" }}>
                <Avatar src={getProfilePic(p?.profile_picture, p?.sex)} alt="" sx={{ width: 32, height: 32, border: 1, borderColor: "divider" }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                        {[p?.first_name, p?.middle_name, p?.last_name].filter(Boolean).join(" ")}
                    </Typography>
                    {sub.user?.id_number &&
                    <Typography noWrap sx={{ fontSize: "0.7rem", color: "text.disabled" }}>{sub.user.id_number}</Typography>}
                </Box>
                <Pill
                    bordered={false}
                    tone={violations.length ? "red" : "green"}
                    label={violations.length ? `${violations.length} Violation${violations.length > 1 ? "s" : ""}` : "No Violation"}
                    sx={{ fontSize: "0.7rem" }}
                />
            </Stack>

            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                {violations.length > 0
                ? <Stack sx={{ gap: 1 }}>
                    {violations.map((v, idx) => {
                        const major = !!v.violation.offense_status
                        return (
                            <Paper key={idx} variant="outlined" sx={{ borderRadius: 2, borderLeft: 4, borderLeftColor: major ? "#ef4444" : "#fb923c", px: 1.5, py: 1.25 }}>
                                <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>{v.violation.violation_name}</Typography>
                                    <Pill
                                        bordered={false}
                                        tone={major ? "red" : "orange"}
                                        label={major ? "Major" : "Minor"}
                                        sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}
                                    />
                                </Stack>
                                <Box sx={{ mt: 1, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                                    <Detail icon={Repeat} label="Offense">{v.occurrence ?? "—"}</Detail>
                                    <Detail icon={Gavel} label="Penalty" title={v.penalty ?? ""}>{v.penalty ?? "No penalty set"}</Detail>
                                </Box>
                            </Paper>
                        )
                    })}
                  </Stack>
                : <Stack direction="row" sx={{ alignItems: "center", gap: 1, fontSize: "0.875rem", color: "text.secondary" }}>
                    {cleared
                        ? <><CheckCircle2 size={16} color="#16a34a" /> No violation committed.</>
                        : <><AlertCircle size={16} color="#9ca3af" /> No violation records found.</>}
                  </Stack>}
            </Box>
        </Paper>
    )
}

// Small "icon Label: value" line inside a violation card.
const Detail = ({ icon: Icon, label, title, children }) => (
    <Stack direction="row" sx={{ alignItems: "center", gap: 1, fontSize: "0.75rem", color: "text.secondary", minWidth: 0 }}>
        <Box component="span" sx={{ display: "flex", color: "text.disabled", flexShrink: 0 }}><Icon size={13} /></Box>
        <Box component="span" sx={{ color: "text.disabled" }}>{label}:</Box>
        <Box component="span" title={title} sx={{ fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</Box>
    </Stack>
)

ViewComplaintModal.Body = Body

export default ViewComplaintModal
