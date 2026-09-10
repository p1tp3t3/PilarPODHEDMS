import AuthLayout from "@/Layouts/auth-layout"
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
            <div className="w-full py-4">
                <div className="w-full grid gap-5 relative">
                    <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                        <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">REFERRALS FROM THE PREFECT</h1>
                    </div>

                    <div className="w-full bg-white rounded-md shadow-sm shadow-black/20 overflow-x-auto">
                        <div className="min-w-[35rem]">
                            <ReferralList
                                list={props.referral?.data}
                                type="sub_admin"
                                viewReferral={setId}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

GuidanceReferral.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default GuidanceReferral
