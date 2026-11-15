import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState } from "react"
import ReferralList from "@/Components/list/referral-list"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import useListData from "@/others/hooks/use-list-data"
import { Head } from "@inertiajs/react"
import SchoolYearSemesterFilter from "@/Components/input/school-year-semester-filter"

const GuidanceReferral = (props) => {
    // The table loads from /api/guidance/referral once the page opens.
    const { data: lists } = useListData()
    const [viewReferral, openViewReferral] = useState(false)
    const [referralId, setReferralId] = useState('')

    const setId = (id) => {
        setReferralId(id)
        openViewReferral(true)
    }

    return (
        <>
            <Head title="Referral" />
            <ViewReferralModal
                close={viewReferral}
                closeModal={openViewReferral}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                referralId={referralId}
            />
            <PageLayout title="REFERRALS FROM THE PREFECT">
                    <SchoolYearSemesterFilter schoolYears={props.school_years} />
                    <div className="w-full bg-white rounded-md shadow-sm shadow-black/20 min-w-0">
                        <ReferralList
                            list={lists?.referral?.data}
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
