import { ReferralService } from "@/others/services/referral-service"
import UpModal from "../up-modal"
import { useEffect, useState } from "react"
import { readableDate, readableTime, toTitleCase, formatSchoolYearSemester } from "@/others/function"
import CircleReload from "@/Components/reload/circle-reload"
import { ModalHeader, Section, Stat, StatGrid, PersonList, safeParseArray } from "./view-modal-parts"
import {
    CalendarClock,
    CheckCircle2,
    XCircle,
    Undo2,
    UserCircle2,
    Users,
    MessageSquareText,
    FileWarning,
    History,
} from "lucide-react"

const STATUS_STYLES = {
    pending: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200',
    approved: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
    rejected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    revoked: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300',
}

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
    const referrerName = toTitleCase(data.user?.profile?.first_name)

    return (
        <div>
            <ModalHeader
                title={`${referrerName}'s Referral`}
                reference={data.referral_number}
                status={data.referral_status}
                styles={STATUS_STYLES}
            />

            <div className="p-6 space-y-4">
                {/* Timeline stats */}
                <StatGrid>
                    <Stat icon={CalendarClock} label="Reported Since" value={`${readableDate(data.created_at)} (${readableTime(data.created_at)})`} sub={formatSchoolYearSemester(data.school_year_semester)} />
                    {data.confirmed_at &&
                    <Stat icon={CheckCircle2} label="Approved Since" value={`${readableDate(data.confirmed_at)} (${readableTime(data.confirmed_at)})`} sub={formatSchoolYearSemester(data.confirmed_school_year_semester)} />}
                    {data.rejected_at &&
                    <Stat icon={XCircle} label="Rejected Since" value={`${readableDate(data.rejected_at)} (${readableTime(data.rejected_at)})`} sub={formatSchoolYearSemester(data.rejected_school_year_semester)} />}
                    {data.revoked_at &&
                    <Stat icon={Undo2} label="Revoked Since" value={`${readableDate(data.revoked_at)} (${readableTime(data.revoked_at)})`} sub={formatSchoolYearSemester(data.revoked_school_year_semester)} />}
                </StatGrid>

                {data.rejected_reason != null &&
                <Section icon={FileWarning} title="Reason for Rejection" tone="border-red-200">
                    <div className="text-sm h-28 overflow-y-auto rounded-md bg-red-50/60 p-3 text-red-800">
                        {data.rejected_reason}
                    </div>
                </Section>}

                {data.referral_status === 'revoked' &&
                <Section icon={Undo2} title="Revoked by Referrer" tone="border-gray-200">
                    <p className="text-sm text-gray-600">
                        The referrer withdrew this referral. It is kept on record and remains visible here, but is no longer active.
                    </p>
                </Section>}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Section icon={UserCircle2} title="Referrer">
                        <PersonList data={data.user} emptyLabel="No referrer on record." />
                    </Section>
                    <Section icon={Users} title="Referred Student">
                        <PersonList
                            data={data.referredStudent}
                            data_list={data.referralReferredStudent != null ? data.referralReferredStudent : null}
                            emptyLabel="No referred student on record." />
                    </Section>
                </div>

                <Section icon={MessageSquareText} title="Reason for the Referral">
                    <div className="text-sm h-32 overflow-y-auto rounded-md bg-gray-50 p-3 text-gray-700 leading-relaxed">
                        {data.reason_description}
                    </div>
                </Section>

                {data.edited_at && data.revisions?.length > 0 && (() => {
                    const previous = data.revisions[0]
                    const previousStudents = safeParseArray(previous.students)
                    return (
                        <Section icon={History} title="Previous Version (Before Edit)" tone="border-amber-200">
                            <div className="grid gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Referred Student(s): </span>
                                    <span className="text-gray-800 font-medium">
                                        {previousStudents.length !== 0
                                            ? previousStudents.map((s) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()).filter(Boolean).join(', ')
                                            : '—'}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Reason:</div>
                                    <div className="rounded-md bg-amber-50/60 p-3 text-gray-700 h-24 overflow-y-auto">{previous.reason_description}</div>
                                </div>
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

ViewReferralModal.Body = Body
export default ViewReferralModal
