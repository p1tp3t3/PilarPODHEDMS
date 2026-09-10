import AuthLayout from "@/Layouts/auth-layout"
import { useState } from "react"
import ReferralList from "@/Components/list/referral-list"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
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

const PrefectReferral = (props) => {
    const MySwal = withReactContent(Swal)
    const url = new URLSearchParams(window.location.search)

    const [viewReferral, openViewReferral] = useState(false),
          [id, setId] = useState(''),
          [referral_req_list, setReferralRequestList] = useState(props.referral_request.data),
          [referral_list, setReferralList] = useState(props.referral.data),
          [choose, setChoose] = useState((url.has('status') ? url.get('status') : 'req'))

    const { loadRegister } = useReload()

    const optionTab = [
        { key: 'req', label: 'Pending Referrals' },
        { key: 'approve', label: 'Approved  Referrals' },
    ]

    const setViewReferralId = (i) => {
        openViewReferral(true)
        setId(i)
    }
    const handleSelect = (type) => {
        if (choose != type) {
            const url = window.location.pathname;
            router.visit(`${url}?status=${type}`)
            setChoose(type)
        }
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
            case 'cancel':
                route = `/referral/verify/${id}/cancel`
                confirmTxt = 'Cancelling the Referral'
                label = 'Are You Sure You Want To Reject The Referral?'
                btn = 'Reject Referral'
                confirm = false
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

                <div className="w-full py-4">
                    <div className="w-full grid gap-5 relative">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                            <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">REFERRAL</h1>
                            <div className="w-full sm:w-auto">
                                <Btn onclick={() => router.visit('/referral/report')} className="">
                                    Report Referral
                                </Btn>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="overflow-x-auto">
                            <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
                        </div>

                        {/* Table/List */}
                        <div className="flex w-full bg-white rounded-md shadow-black/20 shadow-sm overflow-x-auto">
                            <div className="w-full">
                                <ReferralList 
                                    list={referral_list}
                                    style={true} 
                                    viewReferral={setViewReferralId}
                                    type={props.user.role}
                                    events={setRequestActionEvent}
                                />
                            </div>
                        </div>
                    </div>
                </div>
        </>
    )
}

PrefectReferral.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default PrefectReferral
