import AuthLayout from "@/Layouts/auth-layout"
import ReferralList from "@/Components/list/referral-list"
import { useReload } from "@/context-provider/reload-provider"
import { useState } from "react"
import { Head, router } from "@inertiajs/react"
import Btn from "@/Components/button/normal-btn"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import EditReferralModal from "@/Components/modal/submission-form/edit-referral-modal"
import ReportReferralModal from "@/Components/modal/submission-form/report-referral-modal"
import { showWarningModal } from "@/others/function"
import { ReferralService } from "@/others/services/referral-service"

const Referral = (props) => {
    const [viewReferral, openViewReferral] = useState(false),
          [id, setId] = useState(''),
          [editReferral, openEditReferral] = useState(false),
          [editData, setEditData] = useState(null),
          [reportReferral, openReportReferral] = useState(false)

    const { loadRegister } = useReload()

    const setViewReferralId = (i) => {
        openViewReferral(true)
        setId(i)
    }

    const handleEvent = (type, referralId) => {
        if (type === "revoke") {
            showWarningModal(
                'Are You Sure You Want To Revoke This Referral? This will not delete it, but the prefect will still be able to see it.',
                'Revoke Referral',
                'Cancel',
                () => {
                    loadRegister(true, "text-wait", "Revoking Referral Is Processing")
                    ReferralService.revoke(
                        referralId,
                        () => {},
                        () => {
                            loadRegister(true, "success", "Referral Revoked Successfully")
                            router.reload({ only: ['referral'] })
                        },
                        () => loadRegister(true, "error", "Failed to Revoke Referral")
                    )
                }
            )
        } else if (type === "edit") {
            ReferralService.getReferralInfo(referralId, (d) => {
                setEditData(d)
                openEditReferral(true)
            })
        }
    }

    return (
        <>
        <Head title="Referral" />
        <ViewReferralModal
            close={viewReferral}
            closeModal={openViewReferral}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            setId={setViewReferralId}
            referralId={id}
        />
        <EditReferralModal
            close={editReferral}
            closeModal={openEditReferral}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            data={editData}
            student_list={props.students}
            reload={loadRegister}
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
        <div className="w-full py-10 min-w-0">
            <div className="w-full grid gap-10 relative min-w-0">
                <div className="flex w-full justify-between items-center">
                    <h1 className="text-[1.3em]"><b>My Referrals</b></h1>
                    {props.user.allow_referral
                    ?
                    <div>
                        <Btn
                            onclick={() => openReportReferral(true)}
                        >
                            Report Referral
                        </Btn>
                    </div>
                    : ''}
                </div>
                <div className="w-full min-w-0">
                    <ReferralList
                        list={props.referral.data}
                        style={true}
                        viewReferral={setViewReferralId}
                        type={props.user.role}
                        events={handleEvent}
                    />
                </div>
            </div>
        </div>
        </>
    )
}

Referral.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default Referral
