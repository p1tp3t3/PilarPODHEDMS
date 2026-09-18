import AuthLayout from "@/Layouts/auth-layout"
import RequestAbsentFormModal from "@/Components/modal/submission-form/request-absent-form-modal"
import EditAbsentFormModal from "@/Components/modal/submission-form/edit-absent-form-modal"
import { useState } from "react"
import { useReload } from "@/context-provider/reload-provider"
import TabSwitcher from "@/Components/other/tab-switcher"
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function"
import { AbsentFormService } from "@/others/services/absent-form-service"
import { FileText, Clock, CheckCircle2, XCircle, Ban, FolderOpen } from "lucide-react"
import { router } from "@inertiajs/react"

// revoked_at is deliberately not one of these tab keys — the requester
// already knows they revoked their own form, so there's no need for a
// dedicated tab to browse those (only the prefect's review page has one).
const STATUS_META = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
    noted: { label: "Noted", className: "bg-green-100 text-green-700" },
    expired: { label: "Expired", className: "bg-gray-200 text-gray-600" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
    revoked: { label: "Revoked", className: "bg-gray-200 text-gray-600" },
}

const absentFormStatusKey = (form) => {
    if (form.revoked_at) return "revoked"
    if (form.rejected_at) return "rejected"
    if (form.confirmed_at) return "noted"
    if (new Date(form.date_to) < new Date()) return "expired"
    return "pending"
}

const isRevocable = (form) => !form.confirmed_at && !form.rejected_at && !form.revoked_at
const isEditable = (form) => isRevocable(form) && !form.edited_at

const optionTab = [
    { key: "request", label: "Request Absent Form", icon: FileText },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "noted", label: "Noted", icon: CheckCircle2 },
    { key: "expired", label: "Expired", icon: XCircle },
    { key: "rejected", label: "Rejected", icon: Ban },
]

const reasonLabel = (form) => {
    try {
        const reasons = JSON.parse(form.reason || "[]")
        return reasons.join(", ")
    } catch (e) {
        return form.reason ?? ""
    }
}

const AbsentForm = (props) => {
    const [tab, setTab] = useState("request")
    const [editForm, setEditForm] = useState(null)
    const [editOpen, setEditOpen] = useState(false)

    const { loadRegister } = useReload();
    const allForms = props.absent_form_list ?? []
    const shownForms = allForms.filter((form) => absentFormStatusKey(form) === tab)

    const handleRevoke = (id) => {
        showWarningModal(
            "Are You Sure You Want To Revoke This Absent Form?",
            "Revoke Absent Form",
            "Cancel",
            () => {
                loadRegister(true, "text-wait", "Revoking Absent Form Is Processing")
                AbsentFormService.revoke(
                    id,
                    () => {},
                    () => {
                        loadRegister(true, "success", "Absent Form Revoked Successfully")
                        router.reload({ only: ["absent_form_list"] })
                    },
                    () => loadRegister(true, "error", "Failed to Revoke Absent Form")
                )
            }
        )
    }

    return (
        <>
            <EditAbsentFormModal
                close={editOpen}
                closeModal={setEditOpen}
                isEnableOuterClose={true}
                data={editForm}
                reload={(...args) => {
                    loadRegister(...args)
                    if (args[0] === false) router.reload({ only: ['absent_form_list'] })
                }}
            />
            <div className="w-full py-4">
                <div className="w-full grid gap-5 relative">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                        <h1 className="text-[2em] sm:text-[1.5em] font-bold">STUDENT ABSENT FORM</h1>
                    </div>

                    <div className="w-full bg-white rounded-t-md shadow-black/20 shadow-sm border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
                        <TabSwitcher tabs={optionTab} value={tab} onChange={setTab} />
                    </div>

                    {tab === "request" && (
                        <div className="w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm">
                        {props.user.allow_absent_form != 1 ? (
                                // 🚫 Restricted View
                                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                                    <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-100">
                                        <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-8 h-8 text-red-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 11c.828 0 1.5.672 1.5 1.5v4.5a1.5 1.5 0 01-3 0v-4.5c0-.828.672-1.5 1.5-1.5zM12 7a4 4 0 014 4v1H8v-1a4 4 0 014-4z"
                                        />
                                        </svg>
                                    </div>

                                    <h2 className="text-2xl font-bold text-red-600 mb-2">Access Restricted</h2>
                                    <p className="text-gray-700 max-w-md">
                                        You don’t have permission to access or submit this form.
                                        Please contact your <span className="font-semibold">administrator</span> if you believe this is an error.
                                    </p>
                                </div>

                            ) :
                            <RequestAbsentFormModal.Body
                                id={props.user.id}
                                reload={loadRegister}
                            />}
                        </div>
                    )}

                    {tab !== "request" && (
                        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3">
                            {shownForms.length === 0 ? (
                                <div className="py-10 text-center text-gray-500">
                                    <FolderOpen size="2.5em" className="mx-auto mb-2 opacity-60" />
                                    <p>No {STATUS_META[tab].label.toLowerCase()} absent form records found.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {shownForms.map((form) => {
                                        const status = STATUS_META[absentFormStatusKey(form)]
                                        return (
                                            <div
                                                key={form.id}
                                                className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-[0.9em]"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-semibold text-gray-800">
                                                        {form.form_number} — {readableDate(form.created_at)} ({readableTime(form.created_at)})
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[0.8em] font-semibold ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="text-gray-600 mt-1">
                                                    Reason: {reasonLabel(form)}
                                                </div>
                                                <div className="text-gray-600 mt-1">
                                                    {readableDate(form.date_from)} — {readableDate(form.date_to)}
                                                </div>
                                                {form.rejected_at && form.rejected_reason && (
                                                    <div className="text-red-600 mt-1">
                                                        Rejected: {form.rejected_reason}
                                                    </div>
                                                )}
                                                {form.confirmed_at && form.note && (
                                                    <div className="text-gray-600 mt-1">
                                                        Note: {form.note}
                                                    </div>
                                                )}
                                                {absentFormStatusKey(form) === "pending" && (
                                                    <div className="flex gap-2 mt-2">
                                                        {isEditable(form) && (
                                                            <button
                                                                type="button"
                                                                className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[0.85em] font-medium"
                                                                onClick={() => {
                                                                    setEditForm(form)
                                                                    setEditOpen(true)
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md bg-gray-600 hover:bg-gray-700 text-white text-[0.85em] font-medium"
                                                            onClick={() => handleRevoke(form.id)}
                                                        >
                                                            Revoke
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

AbsentForm.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default AbsentForm
