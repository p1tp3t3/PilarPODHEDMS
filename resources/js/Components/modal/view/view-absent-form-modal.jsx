import UpModal from "../up-modal"
import ProfilePic from "../../other/profile-pic"
import { useState, useEffect } from "react"
import { getData, getProfilePic, readableDate, readableTime } from "../../../others/function"
import CircleReload from "@/Components/reload/circle-reload"
import { AbsentFormService } from "@/others/services/absent-form-service"
import { History } from "lucide-react"

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
            pd={props.pd}
            bgColor='bg-white'
            w='w-[38rem]'>
            <div className="w-full">
                {(data != null)
                ?
                <Body data={data} />
                :
                reload &&
                <div className="w-full flex justify-center">
                    <CircleReload size={3} />
                </div>}
            </div>
        </UpModal>
    )
}

const Body = ({ data }) => {
    return (
        <div className="grid gap-3">
            {(data != null)
            ?
            <>
            <div className="text-[1.4em] text-center">
                <h1><b>{data.user.profile?.first_name}'s Absent Form</b></h1>
            </div>
            <div className="grid gap-5">
                <div>
                    <h2 className="text-lg font-semibold">Reference No.</h2>
                    <p className="text-sm">{data.form_number}</p>
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Reported Since</h2>
                    <p className="text-sm">{readableDate(data.created_at)} ({readableTime(data.created_at)})</p>
                </div>
                <div className="grid gap-2">
                    <ProfileSection
                        title='Student'
                        name={`${data.user.profile?.first_name ?? ""} ${data.user.profile?.last_name ?? ""}`}
                        src={getProfilePic(data.user.profile?.profile_picture, data.user.profile?.sex)}
                        program={`${data.user.program?.name ?? ""} ${data.user.enrollments?.[data.user.enrollments.length - 1]?.year_level ?? ""}`} />
                </div>
                <div>
                    <div><b>Date of Absent</b></div>
                    <div className="text-[0.9em]">
                        {readableDate(data.date_from)} to {readableDate(data.date_to)}
                    </div>
                </div>
                <div className="grid gap-2">
                    <div><b>Reason</b></div>
                    <div className="grid gap-1">
                        {safeParseArray(data.reason).map((e, i) =>
                            <div key={i} className="text-[0.9em]">
                                - {e}
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid gap-2">
                    <div><b>Evidence</b></div>
                    <div className="grid grid-cols-3 gap-2">
                        {safeParseArray(data.evidences).map((e, i) => (
                            <a key={i} href={`/absent-form/${data.id}/evidence/${e.file}`} target="_blank" rel="noreferrer" className="block border rounded overflow-hidden">
                                <img src={`/absent-form/${data.id}/evidence/${e.file}`} className="w-full h-24 object-cover" alt={`Evidence ${i + 1}`} />
                            </a>
                        ))}
                    </div>
                </div>
                {data.note &&
                <div className="grid gap-2">
                    <div><b>Note From the Prefect</b></div>
                    <div className="text-sm h-40 overflow-y-auto border rounded p-2 bg-gray-50">{data.note}</div>
                    {data.confirmed_at &&
                    <div>
                        <div><b>Noted Since</b></div>
                        <p className="text-sm">{readableDate(data.confirmed_at)} ({readableTime(data.confirmed_at)})</p>
                    </div>}
                </div>}

                {data.edited_at && data.revisions?.length > 0 && (() => {
                    const previous = data.revisions[0]
                    const previousReasons = safeParseArray(previous.reason)
                    const previousEvidences = safeParseArray(previous.evidences)
                    return (
                        <div className="rounded-xl border border-amber-200 bg-white p-4">
                            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <History size={18} className="text-gray-400" />
                                Previous Version (Before Edit)
                            </h2>
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
                        </div>
                    )
                })()}
            </div>
            </>
            :
            reload &&
            <div className="w-full flex justify-center">
                <CircleReload size={3} />
            </div>}
        </div>
    )
}
const ProfileSection = ({ title, src, name, program }) => {
    return (
        <div>
            <div className="text-[1em]"><b>{title}</b></div>
            <div className="flex gap-2">
                <div><ProfilePic src={src} size={2.5}/></div>
                <div className="grid content-between">
                    <div className="text-[0.9em]"><h1>{name}</h1></div>
                    <div className="text-[0.8em]"><p>{program}</p></div>
                </div>
            </div>
        </div>
    )
}

ViewAbsentFormModal.Body = Body
export default ViewAbsentFormModal