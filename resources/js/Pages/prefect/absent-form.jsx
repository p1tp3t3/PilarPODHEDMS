import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState } from "react"
import DropdownField from "@/Components/input/dropdown"
import RequestAbsentFormModal from "@/Components/modal/submission-form/request-absent-form-modal"
import Btn from "@/Components/button/normal-btn"
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
import { List, Clock, Ban, Undo2, CalendarX } from "lucide-react"
import { Head } from "@inertiajs/react"
import { PageActions } from "@/context-provider/page-title-provider"

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
    const [issueAbsent, openIssueAbsent] = useState(false)
    const { loadRegister } = useReload()
    const [rejectReason, openRejectReason] = useState(false)
    const [data, setData] = useState({
        reason: ''
    })

    const option = [
        { key: 'all', label: 'All Absent Forms', icon: List },
        { key: 'req-current', label: 'Pending', icon: Clock },
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

    // SweetAlert result, same as every other absent form action.
    const successCancel = () => {
        loadRegister(true, '')
        showOutputModal('Absent Form Rejected Successfully', 's', () => loadRegister(false))
    }
    const errorCancel = () => {
        loadRegister(true, '')
        showOutputModal('Failed to Reject Absent Form', 'e', () => loadRegister(false))
    }

    return (
        <>
            <Head title="Absent Form" />
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
                <RequestAbsentFormModal
                    close={issueAbsent}
                    closeModal={openIssueAbsent}
                    pd={["px-5", "py-7"]}
                    isEnableOuterClose={true}
                    reload={loadRegister}
                    issue={true}
                    onIssued={() => router.visit(`${window.location.pathname}?status=all&school-year=${schoolYear}&semester=${semester}`)}
                />
                <PageLayout actionsWithFilters
                    title="STUDENT ABSENT FORMS"
                    rightSideComponent={
                        <Btn onclick={() => openIssueAbsent(true)} icon={<CalendarX size={19} />}>
                            Issue Absent Form
                        </Btn>
                    }
                >
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 md:max-lg:flex-row md:max-lg:flex-nowrap md:max-lg:items-center md:max-lg:[&>div:not(:last-child)]:flex-1 md:max-lg:[&>div:not(:last-child)]:min-w-0 md:max-lg:[&>div:not(:last-child)]:w-auto">
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
                            <PageActions />
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
