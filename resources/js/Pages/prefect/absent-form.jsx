import AuthLayout from "@/Layouts/auth-layout"
import { useState } from "react"
import RequestAbsentFormModal from "@/Components/modal/submission-form/request-absent-form-modal"
import AbsentFormList from "@/Components/list/absent-form-list"
import AbsentFormRequestList from "@/Components/list/absent-form-request-list"
import { useReload } from "@/context-provider/reload-provider"
import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal"
import { AbsentFormService } from "@/others/services/absent-form-service"
import TabSwitcher from "@/Components/other/tab-switcher"
import { router } from "@inertiajs/react"
import NoteAbsentFormModal from "@/Components/modal/submission-form/note-absent-form-modal"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { showWarningModal, showOutputModal } from "@/others/function"
import SetReasonModal from "@/Components/modal/submission-form/set-reason-modal"
import { ArchiveService } from "@/others/services/archive-service"
import { List, CheckCircle2, XCircle, Ban, Undo2 } from "lucide-react"

const PrefectAbsentForm = (props) => {
    const MySwal = withReactContent(Swal)
    const url = new URLSearchParams(window.location.search)

    const [id, setId] = useState('')
    const [lstOption, setLstOption] = useState(url.has('status') ? url.get('status') : 'req-current')
    const [absent_form_list, setAbsentFormRequestList] = useState(props.absent_form_request_list)
    const [viewAbsentForm, openViewAbsentForm] = useState(false)
    const [noteAbsent, openNoteAbsent] = useState(false)
    const { loadRegister } = useReload()
    const [rejectReason, openRejectReason] = useState(false)
    const [data, setData] = useState({
        reason: ''
    })

    const option = [
        { key: 'req-current', label: 'Pending', icon: List },
        { key: 'noted', label: 'Noted', icon: CheckCircle2 },
        { key: 'expired', label: 'Expired', icon: XCircle },
        { key: 'rejected', label: 'Rejected', icon: Ban },
        { key: 'revoked', label: 'Revoked', icon: Undo2 },
    ]

    const handleOption = (type) => {
        setLstOption(type)
        const url = window.location.pathname
        router.visit(`${url}?status=${type}`)
    }

    const setEvents = (i, type) => {
        switch (type) {
            case 'confirm':
                setId(i)
                openNoteAbsent(true)
                break
            case 'cancel':
                setId(i)
                openRejectReason(true)
                break
            case 'view':
                setId(i)
                openViewAbsentForm(true)
                break
            case 'archive':
                showWarningModal(
                    'Are You Sure You Want To Archive This Absent Form?',
                    'Archive Absent Form',
                    'Cancel',
                    () => {
                        loadRegister(true, "text-wait", "Archiving Absent Form")
                        ArchiveService.transfer(
                            'absent form', i,
                            () => {
                                showOutputModal('Absent Form Archived Successfully', 's', () => {
                                    loadRegister(false)
                                    window.location.reload()
                                })
                            },
                            () => {
                                showOutputModal('Failed to Archive Absent Form', 'e', () => loadRegister(false))
                            }
                        )
                    }
                )
                break
        }
    }

    const successConfirm = () => loadRegister(true, 'success', 'Absent Form Noted Successfully')
    const successCancel = () => loadRegister(true, 'success', 'Absent Form Rejected Successfully')
    const errorConfirm = () => loadRegister(true, 'error', 'Failed to Approve Absent Form')
    const errorCancel = () => loadRegister(true, 'error', 'Failed to Reject Absent Form')

    const removeLoad = () => setTimeout(() => loadRegister(false), 3000)

    return (
        <>
            <NoteAbsentFormModal
                close={noteAbsent}
                closeModal={openNoteAbsent}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                reload={loadRegister}
                id={id}
                setter={setAbsentFormRequestList}
            />
            <SetReasonModal
                close={rejectReason}
                closeModal={openRejectReason}
                pd={["px-10", "py-7"]}
                isEnableOuterClose={true}
                title='Reason to Reject this Absent Form'
                data={data}
                setData={setData}
                sendData={() => {
                    loadRegister(true, 'text-wait', 'Rejecting Absent Form')
                    AbsentFormService.reject(id, data.reason, () => {}, successCancel, errorCancel)
                }}
                warning={{ title: 'Are You Sure You Want To Reject This Absent Form?' , btn: 'Reject Absent Form' }}
            />
            <ViewAbsentFormModal
                close={viewAbsentForm}
                closeModal={openViewAbsentForm}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                id={id}
            />
                <div className="w-full py-4">
                    <div className="w-full grid gap-5 relative">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                            <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">STUDENT ABSENT FORMS</h1>
                        </div>

                        {/* Tabs */}
                        <div className="w-full overflow-x-auto">
                            <TabSwitcher tabs={option} value={lstOption} onChange={handleOption} />
                        </div>

                        {/* Table / List Section */}
                        <div className="w-full bg-white rounded-md shadow-sm shadow-black/20 overflow-x-auto">
                            <div className="min-w-[35rem]">
                                <AbsentFormRequestList
                                    style={true}
                                    list={absent_form_list.data}
                                    events={setEvents}
                                    noted={new URLSearchParams(window.location.search).get('status') === 'noted'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
        </>
    )
}

PrefectAbsentForm.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectAbsentForm
