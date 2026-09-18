import UpModal from "../up-modal"
import { useState, useEffect } from "react"
import { readableDate, readableTime, formatSchoolYearSemester } from "../../../others/function"
import CircleReload from "@/Components/reload/circle-reload"
import { AbsentFormService } from "@/others/services/absent-form-service"
import { ModalHeader, Section, Stat, StatGrid, PersonList, safeParseArray } from "./view-modal-parts"
import {
    CalendarClock,
    CheckCircle2,
    XCircle,
    Ban,
    Undo2,
    UserCircle2,
    CalendarRange,
    MessageSquareText,
    ImageIcon,
    FileWarning,
    History,
} from "lucide-react"

const STATUS_STYLES = {
    pending: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200',
    noted: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
    expired: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300',
    rejected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    revoked: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300',
}

const statusFor = (data) => {
    if (data.revoked_at) return 'revoked'
    if (data.rejected_at) return 'rejected'
    if (data.confirmed_at) return 'noted'
    if (data.date_to && new Date(data.date_to) < new Date()) return 'expired'
    return 'pending'
}

const ViewAbsentFormModal = (props) => {

    const [data, setData] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        if(props.close) {
            setReload(true)
            getAbsentFormInfo()
        }else {
            setReload(false)
            setData(null)
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
            <div className="w-full">
                {(data != null)
                ?
                <Body data={data} />
                :
                reload &&
                <div className="w-full flex justify-center py-16">
                    <CircleReload size={3} />
                </div>}
            </div>
        </UpModal>
    )
}

const Body = ({ data }) => {
    const status = statusFor(data)
    const reasons = safeParseArray(data.reason)
    const evidences = safeParseArray(data.evidences)

    return (
        <div>
            <ModalHeader
                title={`${data.user?.profile?.first_name ?? 'Student'}'s Absent Form`}
                reference={data.form_number}
                status={status}
                styles={STATUS_STYLES}
            />

            <div className="p-6 space-y-4">
                {/* Timeline stats */}
                <StatGrid>
                    <Stat icon={CalendarClock} label="Reported Since" value={`${readableDate(data.created_at)} (${readableTime(data.created_at)})`} sub={formatSchoolYearSemester(data.school_year_semester)} />
                    {data.confirmed_at &&
                    <Stat icon={CheckCircle2} label="Noted Since" value={`${readableDate(data.confirmed_at)} (${readableTime(data.confirmed_at)})`} sub={formatSchoolYearSemester(data.confirmed_school_year_semester)} />}
                    {data.rejected_at &&
                    <Stat icon={XCircle} label="Rejected Since" value={`${readableDate(data.rejected_at)} (${readableTime(data.rejected_at)})`} sub={formatSchoolYearSemester(data.rejected_school_year_semester)} />}
                    {data.revoked_at &&
                    <Stat icon={Undo2} label="Revoked Since" value={`${readableDate(data.revoked_at)} (${readableTime(data.revoked_at)})`} sub={formatSchoolYearSemester(data.revoked_school_year_semester)} />}
                    {status === 'expired' &&
                    <Stat icon={Ban} label="Expired Since" value={readableDate(data.date_to)} />}
                </StatGrid>

                {data.rejected_reason != null &&
                <Section icon={FileWarning} title="Reason for Rejection" tone="border-red-200">
                    <div className="text-sm h-28 overflow-y-auto rounded-md bg-red-50/60 p-3 text-red-800">
                        {data.rejected_reason}
                    </div>
                </Section>}

                {status === 'revoked' &&
                <Section icon={Undo2} title="Revoked by Student" tone="border-gray-200">
                    <p className="text-sm text-gray-600">
                        The student withdrew this absent form. It is kept on record and remains visible here, but is no longer active.
                    </p>
                </Section>}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Section icon={UserCircle2} title="Student">
                        <PersonList data={data.user} emptyLabel="No student on record." />
                    </Section>
                    <Section icon={CalendarRange} title="Date of Absence">
                        <p className="text-sm text-gray-700">
                            {readableDate(data.date_from)} to {readableDate(data.date_to)}
                        </p>
                    </Section>
                </div>

                <Section icon={MessageSquareText} title="Reason for Absence">
                    {reasons.length !== 0
                    ? <div className="flex flex-wrap gap-2">
                        {reasons.map((r, i) => (
                            <span key={i} className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                {r}
                            </span>
                        ))}
                      </div>
                    : <p className="text-sm text-gray-500">No reason provided.</p>}
                </Section>

                <Section icon={ImageIcon} title={`Evidence${evidences.length ? ` (${evidences.length})` : ''}`}>
                    {evidences.length !== 0
                    ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {evidences.map((e, i) => {
                            const src = `/absent-form/${data.id}/evidence/${e.file}`
                            return (
                                <a key={i} href={src} target="_blank" rel="noreferrer"
                                   className="group block rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-sm transition">
                                    <img src={src} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200" alt={`Evidence ${i + 1}`} />
                                </a>
                            )
                        })}
                      </div>
                    : <p className="text-sm text-gray-500">No evidence included.</p>}
                </Section>

                {data.note &&
                <Section icon={MessageSquareText} title="Note From the Prefect">
                    <div className="text-sm h-32 overflow-y-auto rounded-md bg-gray-50 p-3 text-gray-700 leading-relaxed">
                        {data.note}
                    </div>
                </Section>}

                {data.edited_at && data.revisions?.length > 0 && (() => {
                    const previous = data.revisions[0]
                    const previousReasons = safeParseArray(previous.reason)
                    const previousEvidences = safeParseArray(previous.evidences)
                    return (
                        <Section icon={History} title="Previous Version (Before Edit)" tone="border-amber-200">
                            <div className="grid gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Date of Absent: </span>
                                    <span className="text-gray-800 font-medium">
                                        {readableDate(previous.date_from)} to {readableDate(previous.date_to)}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Reason:</div>
                                    <div className="rounded-md bg-amber-50/60 p-3 text-gray-700">
                                        {previousReasons.map((r, i) => <div key={i}>- {r}</div>)}
                                    </div>
                                </div>
                                {previousEvidences.length !== 0 &&
                                <div>
                                    <div className="text-gray-500 mb-1">Evidence:</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {previousEvidences.map((e, i) => {
                                            const src = `/absent-form/${data.id}/previous-evidence/${e.file}`
                                            return (
                                                <a key={i} href={src} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={src} className="w-full h-20 object-cover" alt={`Previous evidence ${i + 1}`} />
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
            </div>
        </div>
    )
}

ViewAbsentFormModal.Body = Body
export default ViewAbsentFormModal
