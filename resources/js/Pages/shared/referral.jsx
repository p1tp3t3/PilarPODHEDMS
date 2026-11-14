import AuthLayout from "@/Layouts/auth-layout"
import SchoolYearSemesterFilter from "@/Components/input/school-year-semester-filter"
import SingleRowNotice from "@/Components/other/single-row-notice"
import PageLayout from "@/Layouts/page-layout"
import ReferralList from "@/Components/list/referral-list"
import { useReload } from "@/context-provider/reload-provider"
import { useState, useEffect } from "react"
import { Head, router } from "@inertiajs/react"
import Btn from "@/Components/button/normal-btn"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import EditReferralModal from "@/Components/modal/submission-form/edit-referral-modal"
import ReportReferralModal from "@/Components/modal/submission-form/report-referral-modal"
import { showWarningModal } from "@/others/function"
import { ReferralService } from "@/others/services/referral-service"
import TabSwitcher from "@/Components/other/tab-switcher"
import { List, Clock, CheckCircle2, Ban, Undo2, Send } from "lucide-react"

const optionTab = [
    { key: 'all', label: 'All Referrals', icon: List },
    { key: 'req', label: 'Pending', icon: Clock },
    { key: 'approve', label: 'Approved', icon: CheckCircle2 },
    { key: 'rejected', label: 'Rejected', icon: Ban },
    { key: 'revoked', label: 'Revoked', icon: Undo2 },
]

const Referral = (props) => {
    const [viewReferral, openViewReferral] = useState(false),
          [id, setId] = useState(''),
          [editReferral, openEditReferral] = useState(false),
          [editData, setEditData] = useState(null),
          [reportReferral, openReportReferral] = useState(false)

    const { loadRegister } = useReload()
    const [choose, setChoose] = useState(new URLSearchParams(window.location.search).get('status') || 'req')

    const handleSelect = (type) => {
        if (choose === type) return
        setChoose(type)
        // Keep the school year / semester filters; a single-row view (?id=) ends.
        const q = new URLSearchParams(window.location.search)
        q.set("status", type)
        q.delete("id")
        router.visit(`${window.location.pathname}?${q.toString()}`)
    }

    const setViewReferralId = (i) => {
        openViewReferral(true)
        setId(i)
    }

    // Lets the "My Records This Semester" dashboard modal deep-link
    // straight to a specific referral's view instead of just the list.
    useEffect(() => {
        const viewId = new URLSearchParams(window.location.search).get("view")
        if (viewId) setViewReferralId(viewId)
    }, [])

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
            user={props.user}
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
        <PageLayout actionsWithFilters
            title="MY REFERRALS"
            rightSideComponent={
                props.user.allow_referral
                    ? <Btn onclick={() => openReportReferral(true)} icon={<Send size={18} />}>Report Referral</Btn>
                    : null
            }
        >
            {/* School year / semester (Report Referral sits at the end of this row). */}
            <SchoolYearSemesterFilter schoolYears={props.school_years} />
            <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
            <SingleRowNotice noun="referral" />
            <div className="w-full min-w-0">
                <ReferralList
                    list={props.referral.data}
                    style={true}
                    viewReferral={setViewReferralId}
                    type={props.user.role}
                    events={handleEvent}
                />
            </div>
        </PageLayout>
        </>
    )
}

Referral.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default Referral
