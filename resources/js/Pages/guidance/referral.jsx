import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState } from "react"
import ReferralList from "@/Components/list/referral-list"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"

const GuidanceReferral = (props) => {
    const [viewReferral, openViewReferral] = useState(false)
    const [referralId, setReferralId] = useState('')

    const setId = (id) => {
        setReferralId(id)
        openViewReferral(true)
    }

    return (
        <>
            <ViewReferralModal
                close={viewReferral}
                closeModal={openViewReferral}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                referralId={referralId}
            />
            <PageLayout title="REFERRALS FROM THE PREFECT">
                    <div className="w-full bg-white rounded-md shadow-sm shadow-black/20 min-w-0">
                        <ReferralList
                            list={props.referral?.data}
                            type="sub_admin"
                            viewReferral={setId}
                        />
                    </div>
            </PageLayout>
        </>
    )
}

GuidanceReferral.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default GuidanceReferral
