import AuthLayout from "@/Layouts/auth-layout"
import RequestGatePassModal from "@/Components/modal/submission-form/request-gatepass-modal"
import { useState } from "react"
import GatePassRequestList from "@/Components/list/gatepass-request-list"
import GatePassList from "@/Components/list/gate-pass-list"
import { useReload } from "@/context-provider/reload-provider"
import TabSwitcher from "@/Components/other/tab-switcher"
import { GatePassService } from "@/others/services/gatepass-service"
import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal"
import SetReasonModal from "@/Components/modal/submission-form/set-reason-modal"
import { router } from "@inertiajs/react"
import { showOutputModal, showWarningModal } from "@/others/function"
import { List, CheckCircle2, XCircle, Ban, Undo2 } from "lucide-react"

const PrefectGatePass = (props) => {
    const url = new URLSearchParams(window.location.search)
    const [requestGatePass, openRequestGatePass] = useState(false)
    const [viewGatePass, openViewGatePass] = useState(false)
    const [lstOption, setLstOption] = useState(url.has("status") ? url.get("status") : "req-current")
    const [gatepassRequestList, setGatePassRequestList] = useState(props.gatepass_request_list)
    const [gatepassList, setGatePassList] = useState([])
    const { loadRegister } = useReload()
    const [id, setGatePassId] = useState("")
    const [approved, setApprove] = useState(false)
    const [rejectReason, openRejectReason] = useState(false)

    const [data, setData] = useState({
        reason: "",
        other_reason: "",
    })

    const optionTab = [
      { key: "req-current", label: "Pending", icon: List },
      { key: "confirmed-users", label: "Approved", icon: CheckCircle2 },
      { key: "expired-users", label: "Expired", icon: XCircle },
      { key: "rejected-requests", label: "Rejected", icon: Ban },
      { key: "revoked-requests", label: "Revoked", icon: Undo2 },
    ]
    const handleOption = (e) => {
        setLstOption(e)
        if (e !== lstOption) {
            const url = window.location.pathname
            router.visit(`${url}?status=${e}`)
        }
    }

    const setEvents = (i, type, status) => {
        let action = "",
            confirmTxt = "",
            confirm = false,
            label = "",
            btn = ""

        switch (type) {
            case "confirm":
                setId(i)
                openViewGatePass(true)
                setApprove(true)
                break
            case "cancel":
                setGatePassId(i)
                openRejectReason(true)
                break
            case "confirm-allow-to":
                action = "confirm"
                confirmTxt = "Comfirming the Gate Pass"
                label = "Are You Sure You Want To Approve This Gate Pass Request?"
                btn = "Approve Gate Pass Request"
                confirm = true
                break
            case "view":
                console.log("vieww")
                break
        }

        if (action !== "" && type === "confirm-allow-to") {
            showWarningModal(label, btn, "Cancel", () => {
                loadRegister(true, "text-wait", confirmTxt)
                GatePassService.verify(
                    action,
                    i,
                    status,
                    setGatePassRequestList,
                    confirm ? successApprove : successDisapprove,
                    confirm ? errorApprove : errorDisapprove
                )
            })
        }
    }

    const successApprove = () => {
        loadRegister(true, "")
        showOutputModal(
            "Gate Pass Approved Successfully",
            's',
            () => {
                openViewGatePass(false)
                setApprove(false)
                loadRegister(false)
            }
        )
    }
    const successDisapprove = () => {
        loadRegister(true, "")
        showOutputModal(
            "Gate Pass Disapproved Successfully",
            's',
            () => loadRegister(false)
        )
    }
    const errorApprove = () => {
        loadRegister(true, "")
        showOutputModal(
            "Failed to Approve Gate Pass",
            'e',
            () => loadRegister(false)
        )
    }
    const errorDisapprove = () => {
        loadRegister(true, "")
        showOutputModal(
            "Failed to Disapprove Gate Pass",
            'e',
            () => loadRegister(false)
        )
    }

    const setId = (i) => {
        openViewGatePass(true)
        setGatePassId(i)
    }

    return (
        <>

            <ViewGatePassModal
                close={viewGatePass}
                closeModal={openViewGatePass}
                id={id}
                pd={["px-5", "py-7"]}
                isEnableOuterClose={true}
                approved={approved}
                setApprove={setApprove}
                events={setEvents}
            />

            <RequestGatePassModal
                close={requestGatePass}
                closeModal={openRequestGatePass}
                val={data}
                setter={setData}
                pd={["px-5", "py-7"]}
                isEnableOuterClose={true}
            />

            <SetReasonModal
                close={rejectReason}
                closeModal={openRejectReason}
                pd={["px-10", "py-7"]}
                isEnableOuterClose={true}
                title="Reason to Reject this Gate Pass Request"
                data={data}
                setData={setData}
                sendData={() => {
                    loadRegister(true, "text-wait", "Rejecting Gate Pass Request Is Processing")
                    GatePassService.verify(
                        "cancel",
                        id,
                        { reason: data.reason },
                        setGatePassRequestList,
                        successDisapprove,
                        errorDisapprove
                    )
                }}
                warning={{ title: "Are You Sure You Want To Reject This Gate Pass Request?", btn: "Reject Gate Pass Request" }}
            />

                <div className="w-full py-4">
                    <div className="w-full grid gap-5 relative">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                            <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">GATE PASS</h1>
                        </div>
                        {/* Tabs */}
                        <div className="w-full overflow-x-auto">
                            <TabSwitcher tabs={optionTab} value={lstOption} onChange={handleOption} />
                        </div>

                        {/* Table / List Section */}
                        <div className="w-full bg-white rounded-md shadow-sm shadow-black/20 overflow-x-auto">
                            <div className="min-w-[35rem]">
                                {url.has("status") ? (
                                    <>
                                    {
                                    url.get("status") === "req-current" && (
                                        <GatePassRequestList
                                            list={gatepassRequestList}
                                            events={setEvents}
                                            view={setId}
                                        />
                                    )}
                                    {
                                    url.get('status') == 'confirmed-users' && (
                                        <GatePassList
                                            list={gatepassRequestList}
                                            type={props.user.user_type}
                                            style={true}
                                            view={setId}
                                            events={setEvents}
                                        />
                                    )
                                    }
                                    {
                                    url.get('status') == 'expired-users' && (
                                        <GatePassList
                                            list={gatepassRequestList}
                                            type={props.user.user_type}
                                            style={true}
                                            view={setId}
                                            events={setEvents}
                                        />
                                    )
                                    }
                                    {
                                    url.get('status') == 'rejected-requests' && (
                                        <GatePassRequestList
                                            list={gatepassRequestList}
                                            events={setEvents}
                                            view={setId}
                                        />
                                    )
                                    }
                                    {
                                    url.get('status') == 'revoked-requests' && (
                                        <GatePassRequestList
                                            list={gatepassRequestList}
                                            events={setEvents}
                                            view={setId}
                                        />
                                    )
                                    }</>
                                ) : (
                                    <GatePassRequestList
                                        list={gatepassRequestList}
                                        events={setEvents}
                                        view={setId}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
        </>
    )
}

PrefectGatePass.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectGatePass
