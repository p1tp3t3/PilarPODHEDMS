import SchoolYearSemesterFilter from "@/Components/input/school-year-semester-filter"
import SingleRowNotice from "@/Components/other/single-row-notice"
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
import { Send, List, Clock, CheckCircle2, Ban, Undo2 } from "lucide-react"
import { DataGrid } from "@/Components/other/data-grid"
import ActionBtn from "@/Components/button/action-btn"
import StatusPill from "@/Components/list/status-pill"
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

const AbsentForm = (props) => {
    // The tab is ?status= in the URL; changing it is an Inertia visit and the
    // server sends only that status's forms.
    const [tab, setTab] = useState(() => {
        const s = new URLSearchParams(window.location.search).get("status")
        return optionTab.some((t) => t.key === s) ? s : "all"
    })
    const changeTab = (key) => {
        if (key === tab) return
        setTab(key)
        const params = new URLSearchParams(window.location.search)
        params.delete("view")
        params.delete("id")
        if (key === "all") params.delete("status")
        else params.set("status", key)
        const q = params.toString()
        router.get(`${window.location.pathname}${q ? `?${q}` : ""}`, {}, { preserveState: true, preserveScroll: true, only: ["absent_form_list"] })
    }
    const [requestOpen, setRequestOpen] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [editOpen, setEditOpen] = useState(false)
    const [viewId, setViewId] = useState('')
    const [viewOpen, setViewOpen] = useState(false)

    const { loadRegister } = useReload();
    const allForms = props.absent_form_list ?? []
    const shownForms = allForms

    // Lets the "My Records This Semester" dashboard modal deep-link straight
    // to a specific absent form — opens the same view modal the prefect's
    // page uses.
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("view")
        if (!id) return
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

    const openView = (form) => {
        setViewId(form.encrypted_id)
        setViewOpen(true)
    }

    const columns = [
        {
            field: "index", headerName: "#", width: 60, sortable: false,
            renderCell: (params) => `${params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}.`,
        },
        { field: "form_number", headerName: "Form No.", width: 120 },
        {
            field: "date_from", headerName: "Dates Absent", flex: 1, minWidth: 210,
            renderCell: ({ row }) => (
                <span>{readableDate(row.date_from)}{row.date_to && row.date_to !== row.date_from ? ` — ${readableDate(row.date_to)}` : ""}</span>
            ),
        },
        {
            field: "created_at", headerName: "Submitted", width: 170,
            renderCell: ({ row }) => (
                <div className="leading-tight">
                    <div className="text-[0.85rem]">{readableDate(row.created_at)}</div>
                    <div className="text-[0.72rem] text-gray-500">{readableTime(row.created_at)}</div>
                </div>
            ),
        },
        {
            // Just the status; the rejection reason / note are in the View modal.
            field: "status", headerName: "Status", width: 130, sortable: false,
            valueGetter: (value, row) => STATUS_META[absentFormStatusKey(row)].label,
            // Same solid badge as the other record tables ("noted" shows as Approved).
            renderCell: ({ row }) => {
                const key = absentFormStatusKey(row)
                return <StatusPill status={key === "noted" ? "approved" : key} />
            },
        },
        {
            field: "actions", type: "actions", headerName: "Action", width: 220, align: "left", headerAlign: "left",
            renderCell: ({ row }) => (
                <div className="flex gap-2 items-center h-full">
                    <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => openView(row)}>View</ActionBtn>
                    {isEditable(row) && (
                        <ActionBtn className="bg-green-600 text-white hover:bg-green-700" onClick={() => { setEditForm(row); setEditOpen(true) }}>Edit</ActionBtn>
                    )}
                    {isRevocable(row) && (
                        <ActionBtn className="bg-red-600 text-white hover:bg-red-700" onClick={() => handleRevoke(row.id)}>Revoke</ActionBtn>
                    )}
                </div>
            ),
        },
    ]

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
                    <TabSwitcher tabs={optionTab} value={tab} onChange={changeTab} />
                    <SingleRowNotice noun="absent form" />

                    <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3 min-w-0">
                        <DataGrid
                            rows={shownForms}
                            columns={columns}
                            getRowId={(row) => row.id}
                            getRowHeight={() => "auto"}
                            pagination
                            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                            pageSizeOptions={[20, 50, 100]}
                            disableRowSelectionOnClick
                            hideFooterSelectedRowCount
                            showToolbar
                            // Phones: the form number and status; tap for the rest.
                            mobileSummary={(row) => ({ name: `Absent Form #${row.form_number}`, role: STATUS_META[absentFormStatusKey(row)].label })}
                            localeText={{ noRowsLabel: tab === "all" ? "No absent form records found." : `No ${STATUS_META[tab].label.toLowerCase()} absent form records found.` }}
                            sx={{ "& .MuiDataGrid-cell": { py: 1 } }}
                        />
                    </div>
            </PageLayout>
        </>
    )
}

AbsentForm.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default AbsentForm
