import UpModal from "../up-modal"
import { useState, useEffect } from "react"
import { getData, getProfilePic, readableDate, readableTime, toTitleCase } from "../../../others/function"
import SelectedUser from "../../other/selected-user"
import { ComplaintService } from "@/others/services/complaint-service"
import CircleReload from "@/Components/reload/circle-reload"
import { Link } from "@inertiajs/react"
import {
    AlertCircle,
    Hash,
    CalendarClock,
    CheckCircle2,
    ShieldCheck,
    MessageSquareText,
    FileWarning,
    Users,
    ImageIcon,
    Sparkles,
    UserCircle2,
    ClipboardList,
    Undo2,
    FileText,
    History,
} from "lucide-react"

const ViewComplaintModal = (props) => {
    const [data, setData] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        if (props.close) {
            setReload(true)
            getComplaintInfo()
        } else {
            setReload(false)
            setData(null)
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
            <div className="w-full">
                {(data != null)
                ?
                <Body data={data} usr={props.usr} />
                :
                reload &&
                <div className="w-full flex justify-center py-16">
                    <CircleReload size={3} />
                </div>}
            </div>
        </UpModal>
    )
}

const STATUS_STYLES = {
    rejected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    pending: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200',
    ongoing: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
    resolved: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
    revoked: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300',
}

const MATCH_LEVELS = [
    { label: 'Very Strong Match', min: 0.70, chip: 'bg-green-100 border-green-400 text-green-700', legend: 'bg-green-100 text-green-700 border-green-400' },
    { label: 'Strong Match', min: 0.55, chip: 'bg-yellow-100 border-yellow-400 text-yellow-700', legend: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
    { label: 'Likely Related', min: 0.40, chip: 'bg-orange-100 border-orange-400 text-orange-700', legend: 'bg-orange-100 text-orange-700 border-orange-400' },
    { label: 'Possibly Related', min: 0.25, chip: 'bg-red-100 border-red-400 text-red-700', legend: 'bg-red-100 text-red-700 border-red-400' },
    { label: 'Unclear / Needs Review', min: -Infinity, chip: 'bg-gray-200 border-gray-400 text-gray-700', legend: 'bg-gray-200 text-gray-700 border-gray-400' },
]

const matchLevelFor = (similarity) => MATCH_LEVELS.find(l => similarity >= l.min)

const Section = ({ icon: Icon, title, children, tone = 'border-gray-200' }) => (
    <div className={`rounded-xl border ${tone} bg-white p-4 sm:p-5`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            <Icon size={16} className="text-gray-400 shrink-0" />
            {title}
        </h2>
        {children}
    </div>
)

const Stat = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-2.5">
        <div className="mt-0.5 rounded-md bg-gray-100 p-1.5">
            <Icon size={14} className="text-gray-500" />
        </div>
        <div className="min-w-0">
            <div className="text-[0.7rem] uppercase tracking-wide text-gray-400 font-medium">{label}</div>
            <div className="text-sm font-medium text-gray-800 truncate">{value}</div>
        </div>
    </div>
)

// Defensive against non-string/malformed values from the backend (a bad
// JSON.parse here throws synchronously during render and blanks the whole
// page) — always resolves to an array, never throws.
const safeParseArray = (value) => {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string' || value === '') return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const Body = ({ data, usr }) => {
    const evidences = safeParseArray(data.complaint_evidences)
    const contextAnalysis = safeParseArray(data.context_analysis)
    const complainantName = toTitleCase(data.user != null ? data.user.profile?.first_name : data.complainant_name)

    return (
        <div>
            {/* Header banner */}
            <div className="rounded-t-md bg-gray-50 border-b px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{complainantName}'s Complaint</h1>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                            <Hash size={12} />
                            {data.complaint_number}
                        </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[data.complaint_status] ?? 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200'}`}>
                        {toTitleCase(data.complaint_status)}
                    </span>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {/* Timeline stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                    <Stat icon={CalendarClock} label="Reported Since" value={`${readableDate(data.created_at)} (${readableTime(data.created_at)})`} />
                    {data.confirmed_at &&
                    <Stat icon={CheckCircle2} label="Approved Since" value={`${readableDate(data.confirmed_at)} (${readableTime(data.confirmed_at)})`} />}
                    {data.offense_issued_at &&
                    <Stat icon={ShieldCheck} label="Resolved Since" value={`${readableDate(data.offense_issued_at)} (${readableTime(data.offense_issued_at)})`} />}
                    {data.revoked_at &&
                    <Stat icon={Undo2} label="Revoked Since" value={`${readableDate(data.revoked_at)} (${readableTime(data.revoked_at)})`} />}
                </div>

                {data.edited_at && data.revisions?.length > 0 && (() => {
                    const previous = data.revisions[0]
                    const previousSubjects = safeParseArray(previous.subjects)
                    const previousEvidences = safeParseArray(previous.complaint_evidences)
                    return (
                        <Section icon={History} title="Previous Version (Before Edit)" tone="border-amber-200">
                            <div className="grid gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Incident: </span>
                                    <span className="text-gray-800 font-medium">{previous.incident ? toTitleCase(previous.incident) : '—'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Subject(s): </span>
                                    <span className="text-gray-800 font-medium">
                                        {previousSubjects.length !== 0
                                            ? previousSubjects.map((s) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()).filter(Boolean).join(', ')
                                            : '—'}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Reason:</div>
                                    <div className="rounded-md bg-amber-50/60 p-3 text-gray-700 h-24 overflow-y-auto">{previous.complaint_description}</div>
                                </div>
                                {previousEvidences.length !== 0 &&
                                <div>
                                    <div className="text-gray-500 mb-1">Evidence:</div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {previousEvidences.map((e, i) => {
                                            const src = `/complaint/${data.id}/previous-evidence/${e.file}`
                                            return (
                                                <a key={i} href={src} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300">
                                                    {e.type === 'vid'
                                                    ? <video src={src} className="w-full h-20 object-cover" />
                                                    : <img src={src} className="w-full h-20 object-cover" alt={`Previous evidence ${i + 1}`} />}
                                                </a>
                                            )
                                        })}
                                    </div>
                                </div>}
                                <div className="text-[0.75em] text-gray-400">
                                    Edited on {readableDate(data.edited_at)} ({readableTime(data.edited_at)})
                                </div>
                            </div>
                        </Section>
                    )
                })()}

                {data.rejected_reason != null &&
                <Section icon={FileWarning} title="Reason for Rejection" tone="border-red-200">
                    <div className="text-sm h-32 overflow-y-auto rounded-md bg-red-50/60 p-3 text-red-800">
                        {data.rejected_reason}
                    </div>
                </Section>}

                {data.complaint_status === 'revoked' &&
                <Section icon={Undo2} title="Revoked by Complainant" tone="border-gray-200">
                    <p className="text-sm text-gray-600">
                        The complainant withdrew this complaint. It is kept on record and remains visible here, but is no longer active.
                    </p>
                </Section>}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Section icon={UserCircle2} title="Complainant">
                        {data.user != null
                        ? <ProfileBody data={data.user} />
                        : <div className="text-sm text-gray-700">{toTitleCase(data.complainant_name)}</div>}
                    </Section>
                    <Section icon={Users} title="Subject">
                        <ProfileBody
                            data={data.subject}
                            data_list={data.complaintSubject != null ? data.complaintSubject : null} />
                    </Section>
                </div>

                <Section icon={ClipboardList} title="Incident Reported">
                    <p className="text-sm text-gray-700">{toTitleCase(data.violation?.violation_name)}</p>
                </Section>

                <Section icon={MessageSquareText} title="Reason by the Complainant">
                    <div className="text-sm h-32 overflow-y-auto rounded-md bg-gray-50 p-3 text-gray-700 leading-relaxed">
                        {data.complaint_description}
                    </div>
                </Section>

                {usr.role === "sub_admin" &&
                <Section icon={Sparkles} title="Context of the Complainant's Reason">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {MATCH_LEVELS.map((l, i) => (
                            <span key={i} className={`text-[0.7rem] font-semibold px-2.5 py-0.5 rounded-full border ${l.legend}`}>
                                {l.label}
                            </span>
                        ))}
                    </div>
                    {contextAnalysis.length !== 0
                    ? <div className="flex flex-wrap gap-2 p-3 rounded-md bg-gray-50">
                        {contextAnalysis.map((e, i) => {
                            const level = matchLevelFor(e.similarity)
                            return (
                                <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${level.chip}`}>
                                    {e.violation}
                                </span>
                            )
                        })}
                      </div>
                    : <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <AlertCircle size={28} className="mb-2" />
                        <p className="text-sm font-medium">No Context Analyzed</p>
                      </div>}
                </Section>}

                <Section icon={ImageIcon} title={`Additional Evidences${evidences.length ? ` (${evidences.length})` : ''}`}>
                    {evidences.length !== 0
                    ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {evidences.map((e, i) => {
                            const src = `/complaint/${data.id}/evidence/${e.file}`
                            return (
                                <a key={i} href={src} target="_blank" rel="noreferrer"
                                   className="group block rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-sm transition">
                                    {e.type === 'vid'
                                    ? <video src={src} className="w-full h-32 object-cover" controls />
                                    : <img src={src} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200" alt={`Evidence ${i + 1}`} />}
                                </a>
                            )
                        })}
                      </div>
                    : <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <AlertCircle size={28} className="mb-2" />
                        <div className="text-sm font-medium">No Evidences Included</div>
                      </div>}
                </Section>

                {data.complaint_status === "resolved" && (() => {
                    const summary = data.incident_summary || data.complaintSubject?.find(s => s.incident_summary)?.incident_summary
                    return summary &&
                        <Section icon={FileText} title="Summary About the Incident">
                            <div className="rounded-md bg-gray-50 h-32 overflow-y-auto p-3 text-sm text-gray-800 leading-relaxed">
                                {summary}
                            </div>
                        </Section>
                })()}

                {data.complaint_status === "resolved" &&
                data.complaintSubject?.map((sub, i) => {
                    const offenses = (data.complaintSubjectViolation || []).filter(
                        off => off.student_id === sub.student_id
                    )

                    return (
                        <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                                <h2 className="text-sm font-bold text-gray-800">
                                    {sub.user?.profile?.first_name} {sub.user?.profile?.middle_name} {sub.user?.profile?.last_name}
                                </h2>
                            </div>

                            <div className="p-4 sm:p-5 space-y-4">
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                                        Offenses
                                    </h3>

                                    {offenses.length > 0
                                    ? <div className="flex flex-wrap gap-2">
                                        {offenses.map((off, idx) => {
                                            const hasViolation = !!off.violation
                                            const label = hasViolation ? off.violation.violation_name : "No Violation Committed"
                                            const type = hasViolation ? (off.violation.offense_status ? "major" : "minor") : "none"
                                            const badgeColor = type === "major" ? "bg-red-600" : type === "minor" ? "bg-orange-500" : "bg-gray-500"

                                            return (
                                                <span key={idx} className={`inline-block text-white text-xs font-medium px-3 py-1 rounded-full ${badgeColor}`}>
                                                    {label}
                                                    {type !== "none" && <span className="ml-1 opacity-80">({type})</span>}
                                                </span>
                                            )
                                        })}
                                      </div>
                                    : <span className="text-xs text-gray-500">No Offense Records Found</span>}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const ProfileBody = ({ data, data_list = null }) => {
    if (data_list != null && data_list.length !== 0) {
        return (
            <div className="grid gap-1">
                {data_list.map((e, i) =>
                <Link key={i} href={`/profile/${e.user.username}`} className="block">
                    <SelectedUser
                        src={getProfilePic(e.user.profile?.profile_picture, e.user.profile?.sex)}
                        name={[e.user.profile?.first_name, e.user.profile?.last_name]}
                        user={e.user}
                    />
                </Link>)}
            </div>
        )
    }

    return (
        <Link href={`/profile/${data.username}`} className="block">
            <SelectedUser
                src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
                name={[data.profile?.first_name, data.profile?.last_name]}
                user={data}
            />
        </Link>
    )
}

ViewComplaintModal.Body = Body

export default ViewComplaintModal
