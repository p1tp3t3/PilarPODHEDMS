import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState, useEffect } from "react"
import DropdownField from "@/Components/input/dropdown"
import ReferralList from "@/Components/list/referral-list"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import ReportReferralModal from "@/Components/modal/submission-form/report-referral-modal"
import Btn from "@/Components/button/normal-btn"
import { BroadcastManager } from "@/others/classes/broadcast-manager"
import TabSwitcher from "@/Components/other/tab-switcher"
import { router } from "@inertiajs/react"
import { ReferralService } from "@/others/services/referral-service"
import { useReload } from "@/context-provider/reload-provider"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { showOutputModal, showWarningModal } from "@/others/function"
import { ArchiveService } from "@/others/services/archive-service"
import SetReasonModal from "@/Components/modal/submission-form/set-reason-modal"
import { List, Clock, CheckCircle2, Ban, Undo2 } from "lucide-react"

const PrefectReferral = (props) => {
    const MySwal = withReactContent(Swal)
    const url = new URLSearchParams(window.location.search)

    const [viewReferral, openViewReferral] = useState(false),
          [id, setId] = useState(''),
          [reportReferral, openReportReferral] = useState(false),
          [referral_req_list, setReferralRequestList] = useState(props.referral_request.data),
          [referral_list, setReferralList] = useState(props.referral.data),
          [choose, setChoose] = useState((url.has('status') ? url.get('status') : 'req')),
          [schoolYear, setSchoolYear] = useState(url.get('school-year') || 'all'),
          [semester, setSemester] = useState(url.get('semester') || 'all'),
          [rejectReason, openRejectReason] = useState(false),
          [rejectId, setRejectId] = useState(''),
          [reasonData, setReasonData] = useState({ reason: '' })

    const { loadRegister } = useReload()

    const optionTab = [
        { key: 'all', label: 'All Referrals', icon: List },
        { key: 'req', label: 'Pending Referrals', icon: Clock },
        { key: 'approve', label: 'Approved Referrals', icon: CheckCircle2 },
        { key: 'rejected', label: 'Rejected Referrals', icon: Ban },
        { key: 'revoked', label: 'Revoked Referrals', icon: Undo2 },
    ]

    // The Report Referral modal reloads via router.reload({ only: ['referral'] })
    // instead of a full page navigation now, so referral_list (seeded once from
    // props at mount) needs to stay in sync with that prop on its own.
    useEffect(() => {
        setReferralList(props.referral.data)
    }, [props.referral])

    const setViewReferralId = (i) => {
        openViewReferral(true)
        setId(i)
    }
    const handleSelect = (type) => {
        if (choose != type) {
            const link = window.location.pathname;
            router.visit(`${link}?status=${type}&school-year=${schoolYear}&semester=${semester}`)
            setChoose(type)
        }
    }

    const handleFilterChange = (field, value) => {
        const link = window.location.pathname
        const newSchoolYear = field === 'school-year' ? value : schoolYear
        const newSemester = field === 'semester' ? value : semester
        router.visit(`${link}?status=${choose}&school-year=${newSchoolYear}&semester=${newSemester}`)
    }
    const setRequestActionEvent = (type, id) => {
        let route = '',
            confirmTxt = '',
            confirm = false,
            label = '',
            btn = ''

        if (type === 'archive') {
            showWarningModal(
                'Are You Sure You Want To Archive This Referral?',
                'Archive Referral',
                'Cancel',
                () => {
                    loadRegister(true, "text-wait", "Archiving Referral")
                    ArchiveService.transfer(
                        'referral', id,
                        () => {
                            showOutputModal('Referral Archived Successfully', 's', () => {
                                loadRegister(false)
                                window.location.reload()
                            })
                        },
                        () => {
                            showOutputModal('Failed to Archive Referral', 'e', () => loadRegister(false))
                        }
                    )
                }
            )
            return
        }

        if (type === 'cancel') {
            setRejectId(id)
            openRejectReason(true)
            return
        }

        switch(type) {
            case 'confirm':
                route = `/referral/verify/${id}/confirm`
                confirmTxt = 'Comfirming the Referral'
                label = 'Are You Sure You Want To Approve The Referral?'
                btn = 'Approve Referral'
                confirm = true
                break
            case 'send-guidance':
                route = `/referral/verify/${id}/send-guidance`
                confirmTxt = 'Sending the Referral to the Guidance'
                confirm = true
                break
        }
        showWarningModal(
            label,
            btn,
            'Cancel',
            () => {
                loadRegister(true, "text-wait", confirmTxt)
                const callBack = (confirm) ? successConfirm : successCancel
                ReferralService.verify(type, id, setter, callBack, (confirm) ? errorApprove : errorCancel)
            }
        )
    }

    const successConfirm = (e) => {
        loadRegister(true, '')
        showOutputModal(
            "Referral Confirmed Successfully",
            's',
            () => loadRegister(false)
        )
    }
    const successCancel = (e) => {
        loadRegister(true, '')
        showOutputModal(
            "Referral Rejected Successfully",
            's',
            () => loadRegister(false)
        )
    }
    const errorApprove = () => {
        loadRegister(true, '')
        showOutputModal(
            "Failed to Approve Referral",
            'e',
            () => loadRegister(false)
        )
    }
    const errorCancel = () => {
        loadRegister(true, '')
        showOutputModal(
            "Failed to Reject Referral",
            'e',
            () => loadRegister(false)
        )
    }
    const setter = (s) => {
        setReferralList(s.data)
    }

    return (
        <>
            <ViewReferralModal
                close={viewReferral}
                closeModal={openViewReferral}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                setId={setViewReferralId}
                referralId={id}
            />
            <ReportReferralModal
                close={reportReferral}
                closeModal={openReportReferral}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                user={props.user}
                students={props.students}
                reload={loadRegister}
            />
            <SetReasonModal
                close={rejectReason}
                closeModal={openRejectReason}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                title='Reason to Reject this Referral'
                data={reasonData}
                setData={setReasonData}
                sendData={() => {
                    loadRegister(true, 'text-wait', 'Rejecting Referral')
                    ReferralService.reject(rejectId, reasonData.reason, setter, successCancel, errorCancel)
                }}
                warning={{ title: 'Are You Sure You Want To Reject This Referral?', btn: 'Reject Referral' }}
            />

                <PageLayout
                    title="REFERRAL"
                    rightSideComponent={
                        <div className="w-full sm:w-auto">
                            <Btn onclick={() => openReportReferral(true)} className="">
                                Report Referral
                            </Btn>
                        </div>
                    }
                >
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
                        <div className="overflow-x-auto">
                            <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
                        </div>

                        {/* Table/List */}
                        <div className="flex w-full bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
                            <div className="w-full min-w-0">
                                <ReferralList
                                    list={referral_list}
                                    style={true}
                                    viewReferral={setViewReferralId}
                                    type={props.user.role}
                                    events={setRequestActionEvent}
                                />
                            </div>
                        </div>
                </PageLayout>
        </>
    )
}

PrefectReferral.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default PrefectReferral
