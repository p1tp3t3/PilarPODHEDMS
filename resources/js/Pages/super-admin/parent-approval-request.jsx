import { showLoadingModal } from "@/others/function";
import ParentRequestList from "@/Components/list/parent-request-list"
import RegisterFamilyModal from "@/Components/modal/submission-form/register-family-modal"
import SetReasonModal from "@/Components/modal/submission-form/set-reason-modal"
import ViewParentRequestModal from "@/Components/modal/view/view-parent-request-modal"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { FamilyService } from "@/others/services/family-service"
import { useState } from "react"
import { Head } from "@inertiajs/react"
import { useReload } from "@/context-provider/reload-provider"
import TabSwitcher from "@/Components/other/tab-switcher"

const ParentApprovalRequest = (props) => {
    const [viewParent, openParent] = useState(false),
          [rejectReason, openRejectReason] = useState(false),
          [parent, setParent] = useState(null),
          [parent_request_list, setParentRequestList] = useState(props.parent_requests),
          [id, setId] = useState(''),
          [familyRegistration, openFamilyRegistration] = useState(false)

    const [data, setData] = useState({
        reason: ''
    })
    const { loadRegister } = useReload()
    const [tab, setTab] = useState('all')
    const all = parent_request_list ?? []
    const shown = tab === 'all' ? all : all.filter((r) => (r.status ?? 'pending') === tab)

    const setEvent = (t, i, info) => {
        if(t == 'v') {
            openParent(true)
            setId(i)
        }if(t == 'a') {
            console.log(info)
            setParent(info)
            openFamilyRegistration(true)
            /*
            showWarningModal(
                'This Will Generate ' +  info.name + "'s Account And Create The Family Background. Are You Sure You Want To Approve The Request?",
                'Approve',
                'Cancel',
                () => {
                    showLoadingModal("Approving the parent registration request")
                    const api = new APIRequest(
                        `/super-admin/parent-request/approve`, 
                        'post', 
                        null, 
                        setParentRequestList,
                        () => {
                            showOutputModal(
                                info.name + "'s Request Has Been Approved Successfully",
                                's',
                                () => {

                                }
                            )
                        },
                        () => {
                            showOutputModal(
                                "There Was An Error While Approving " + info.name + "'s Request",
                                'e',
                                () => {

                                }
                            )
                        }
                    )
                    api.fetchData()
                }
            ) */
        }if(t == 'r') {
            setId(i)
            openRejectReason(true)
        }
    }

    return (
        <>
        <Head title="Parent Registration Requests" />
        <SetReasonModal
            close={rejectReason}
            closeModal={openRejectReason}
            pd={["px-10", "py-7"]}
            isEnableOuterClose={true}
            title='Reason to Reject this Parent Registration Request'
            data={data}
            setData={setData}
            sendData={() => {
                loadRegister(true, "text-wait", 'Rejecting Parent Registration Request Is Processing')
                FamilyService.rejectParentRequest(
                    id,
                    data.reason,
                    setParentRequestList,
                    () => {
                        loadRegister(true, "success", "Parent Registration Request Rejected")
                        openRejectReason(false)
                        setData({ reason: '' })
                    },
                    (e) => loadRegister(true, "error", e?.response?.data?.message ?? "Failed to Reject the Parent Registration Request")
                )
            }}
            warning={{ title: 'Are You Sure You Want To Reject This Parent Registration Request?' , btn: 'Reject Request' }}
            />
        <RegisterFamilyModal 
            close={familyRegistration} 
            closeModal={openFamilyRegistration} 
            setter={setParent}
            pd={['px-5', 'py-7']} 
            isEnableOuterClose={true} 
            parent={parent}
        />
        {
        <ViewParentRequestModal
            close={viewParent} 
            closeModal={openParent} 
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            id={id}
        />}
        <PageLayout title="PARENT REGISTRATION REQUESTS">
            <div className="grid gap-3">
                <TabSwitcher
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { key: 'all', label: 'All Requests' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'rejected', label: 'Rejected' },
                    ]}
                />
                <ParentRequestList
                    list={shown}
                    event={setEvent}
                />
            </div>
        </PageLayout>
        </>
    )
}

ParentApprovalRequest.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ParentApprovalRequest