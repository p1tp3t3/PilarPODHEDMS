import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState } from "react"
import DropdownField from "@/Components/input/dropdown"
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
import { List, Clock, CheckCircle2, XCircle, Ban, Undo2 } from "lucide-react"

const PrefectAbsentForm = (props) => {
    const MySwal = withReactContent(Swal)
    const url = new URLSearchParams(window.location.search)

    const [id, setId] = useState('')
    const [lstOption, setLstOption] = useState(url.has('status') ? url.get('status') : 'req-current')
    const [absent_form_list, setAbsentFormRequestList] = useState(props.absent_form_request_list)
    const [schoolYear, setSchoolYear] = useState(url.get('school-year') || 'all')
    const [semester, setSemester] = useState(url.get('semester') || 'all')
    const [viewAbsentForm, openViewAbsentForm] = useState(false)
    const [noteAbsent, openNoteAbsent] = useState(false)
    const { loadRegister } = useReload()
    const [rejectReason, openRejectReason] = useState(false)
    const [data, setData] = useState({
        reason: ''
    })

    const option = [
        { key: 'all', label: 'All', icon: List },
        { key: 'req-current', label: 'Pending', icon: Clock },
        { key: 'noted', label: 'Noted', icon: CheckCircle2 },
        { key: 'expired', label: 'Expired', icon: XCircle },
        { key: 'rejected', label: 'Rejected', icon: Ban },
        { key: 'revoked', label: 'Revoked', icon: Undo2 },
    ]

    const handleOption = (type) => {
        setLstOption(type)
        const link = window.location.pathname
        router.visit(`${link}?status=${type}&school-year=${schoolYear}&semester=${semester}`)
    }

    const handleFilterChange = (field, value) => {
        const link = window.location.pathname
        const newSchoolYear = field === 'school-year' ? value : schoolYear
        const newSemester = field === 'semester' ? value : semester
        router.visit(`${link}?status=${lstOption}&school-year=${newSchoolYear}&semester=${newSemester}`)
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
                <PageLayout title="STUDENT ABSENT FORMS">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3">
                            <div className="w-full sm:w-56">
                                <DropdownField
                                    default={{ val: 'all', label: 'All School Years' }}
                                    list={(props.school_years || []).map((y) => ({ val: y, label: y }))}
                                    val={schoolYear}
                                    onChange={(e) => handleFilterChange('school-year', e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-56">
                                <DropdownField
                                    default={{ val: 'all', label: 'All Semesters' }}
                                    list={[
                                        { val: 1, label: '1st Semester' },
                                        { val: 2, label: '2nd Semester' },
                                    ]}
                                    val={semester}
                                    onChange={(e) => handleFilterChange('semester', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="w-full overflow-x-auto">
                            <TabSwitcher tabs={option} value={lstOption} onChange={handleOption} />
                        </div>

                        {/* Table / List Section */}
                        <div className="w-full bg-white rounded-md shadow-sm shadow-black/20 min-w-0">
                                <AbsentFormRequestList
                                    style={true}
                                    list={absent_form_list.data}
                                    events={setEvents}
                                    noted={new URLSearchParams(window.location.search).get('status') === 'noted'}
                                />
                        </div>
                </PageLayout>
        </>
    )
}

PrefectAbsentForm.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectAbsentForm
