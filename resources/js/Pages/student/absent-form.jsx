import SchoolYearSemesterFilter from "@/Components/input/school-year-semester-filter"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import RequestAbsentFormModal from "@/Components/modal/submission-form/request-absent-form-modal"
import EditAbsentFormModal from "@/Components/modal/submission-form/edit-absent-form-modal"
import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal"
import { useState, useEffect } from "react"
import { useReload } from "@/context-provider/reload-provider"
import TabSwitcher from "@/Components/other/tab-switcher"
import Btn from "@/Components/button/normal-btn"
import { readableDate, readableTime, showWarningModal, showOutputModal, toTitleCase } from "@/others/function"
import { AbsentFormService } from "@/others/services/absent-form-service"
import { Send, List, Clock, CheckCircle2, Ban, FolderOpen, Undo2 } from "lucide-react"
import { Head, router } from "@inertiajs/react"

const STATUS_META = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
    noted: { label: "Approved", className: "bg-green-100 text-green-700" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
    revoked: { label: "Revoked", className: "bg-gray-200 text-gray-600" },
}

const absentFormStatusKey = (form) => {
    if (form.revoked_at) return "revoked"
    if (form.rejected_at) return "rejected"
    if (form.confirmed_at) return "noted"
    return "pending"
}

const isRevocable = (form) => !form.confirmed_at && !form.rejected_at && !form.revoked_at
const isEditable = (form) => isRevocable(form) && !form.edited_at

const optionTab = [
    { key: "all", label: "All Absent Forms", icon: List },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "noted", label: "Approved", icon: CheckCircle2 },
    { key: "rejected", label: "Rejected", icon: Ban },
    { key: "revoked", label: "Revoked", icon: Undo2 },
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
    const [tab, setTab] = useState("all")
    const [requestOpen, setRequestOpen] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [editOpen, setEditOpen] = useState(false)
    const [viewId, setViewId] = useState('')
    const [viewOpen, setViewOpen] = useState(false)

    const { loadRegister } = useReload();
    const allForms = props.absent_form_list ?? []
    const shownForms = tab === "all"
        ? allForms
        : allForms.filter((form) => absentFormStatusKey(form) === tab)

    // Lets the "My Records This Semester" dashboard modal deep-link straight
    // to a specific absent form — jumps to whichever status tab it actually
    // belongs to and opens the same view modal the prefect's page uses.
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("view")
        if (!id) return
        const match = allForms.find((form) => form.encrypted_id === id)
        if (match) setTab(absentFormStatusKey(match))
        setViewId(id)
        setViewOpen(true)
    }, [])

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
                        loadRegister(true, "")
                        showOutputModal("Absent Form Revoked Successfully", "s", () => {
                            loadRegister(false)
                            router.reload({ only: ["absent_form_list"] })
                        })
                    },
                    () => {
                        loadRegister(true, "")
                        showOutputModal("Failed to Revoke Absent Form", "e", () => loadRegister(false))
                    }
                )
            }
        )
    }

    return (
        <>
            <Head title="Absent Form" />
            <ViewAbsentFormModal
                close={viewOpen}
                closeModal={setViewOpen}
                isEnableOuterClose={true}
                id={viewId}
            />
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
            <RequestAbsentFormModal
                close={requestOpen}
                closeModal={setRequestOpen}
                pd={["px-5", "py-7"]}
                isEnableOuterClose={true}
                id={props.user.id}
                reload={loadRegister}
                onIssued={() => router.reload({ only: ["absent_form_list"] })}
            />
            <PageLayout actionsWithFilters
                title="ABSENT FORM"
                rightSideComponent={
                    props.user.allow_absent_form == 1 ? (
                        <Btn onclick={() => setRequestOpen(true)} icon={<Send size={19} />}>Send Absent Form</Btn>
                    ) : null
                }
            >
                    <SchoolYearSemesterFilter schoolYears={props.school_years} />
                    <TabSwitcher tabs={optionTab} value={tab} onChange={setTab} />

                    {(
                        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3">
                            {shownForms.length === 0 ? (
                                <div className="py-10 text-center text-gray-500">
                                    <FolderOpen size="2.5em" className="mx-auto mb-2 opacity-60" />
                                    <p>{tab === "all" ? "No absent form records found." : `No ${STATUS_META[tab].label.toLowerCase()} absent form records found.`}</p>
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
            </PageLayout>
        </>
    )
}

AbsentForm.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default AbsentForm
