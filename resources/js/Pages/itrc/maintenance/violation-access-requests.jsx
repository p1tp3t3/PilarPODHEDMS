import { useEffect, useMemo, useState } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import { Box, Chip } from "@mui/material"
import { AlertTriangle, ClipboardList, Plus, Pencil, Trash2 } from "lucide-react"
import ActionBtn from "@/Components/button/action-btn"
import FormButton from "@/Components/button/button"
import DropdownField from "@/Components/input/dropdown"
import FormTextfield from "@/Components/input/form-input"
import RichTextEditor from "@/Components/input/rich-text-editor"
import UpModal from "@/Components/modal/up-modal"
import TabSwitcher from "@/Components/other/tab-switcher"
import ProfilePic from "@/Components/other/profile-pic"
import { ViolationAccessService } from "@/others/services/violation-access-service"
import { getProfilePic, readableDate, readableTime, showOutputModal, showWarningModal, toTitleCase } from "@/others/function"

const RESOURCES = [
    { val: "violation", label: "Violation Management", icon: AlertTriangle },
    { val: "penalty", label: "Penalty Management", icon: ClipboardList },
]

// Penalties have no "edit" endpoint — only add/delete.
const ACCESS_TYPES_BY_RESOURCE = {
    violation: [
        { val: "add", label: "Add", icon: Plus },
        { val: "edit", label: "Edit", icon: Pencil },
        { val: "delete", label: "Delete", icon: Trash2 },
    ],
    penalty: [
        { val: "add", label: "Add", icon: Plus },
        { val: "delete", label: "Delete", icon: Trash2 },
    ],
}

const STATUS_COLOR = {
    pending: { bg: "#fef3c7", fg: "#b45309" },
    approved: { bg: "#dcfce7", fg: "#15803d" },
    denied: { bg: "#fee2e2", fg: "#b91c1c" },
    expired: { bg: "#f3f4f6", fg: "#6b7280" },
    revoked: { bg: "#f3f4f6", fg: "#6b7280" },
    used: { bg: "#e0e7ff", fg: "#4338ca" },
}

const StatusChip = ({ status }) => {
    const c = STATUS_COLOR[status] ?? STATUS_COLOR.expired
    return (
        <Chip
            label={status.charAt(0).toUpperCase() + status.slice(1)}
            size="small"
            sx={{ fontWeight: 600, backgroundColor: c.bg, color: c.fg }}
        />
    )
}

const isActiveRow = (row) => row.status === "approved" && row.expires_at && new Date(row.expires_at) > new Date()

// The timestamp for whichever transition actually applies to this request's
// current status — `responded_at` alone can't tell approved/denied/revoked
// apart once overwritten, so each status keeps its own column.
const statusTimestamp = (r) => {
    switch (r.status) {
        case "approved": return r.approved_at
        case "denied": return r.denied_at
        case "revoked": return r.revoked_at
        case "used": return r.used_at
        default: return null
    }
}

const dt = (value) => value ? `${readableDate(value)} (${readableTime(value)})` : "—"

const ViolationAccessRequests = ({ user }) => {
    const isSuperAdmin = user?.role === "super_admin"

    return isSuperAdmin
        ? <SuperAdminAccessPanel />
        : <PrefectAccessPanel />
}

// ========================
// SUPER ADMIN: request form + own request history
// ========================
const SuperAdminAccessPanel = () => {
    const [requests, setRequests] = useState(null)
    const [hasAccess, setHasAccess] = useState({})
    const [mainTab, setMainTab] = useState("request")
    const [activeResource, setActiveResource] = useState("violation")
    const [showForm, openForm] = useState(false)
    const [resource, setResource] = useState("")
    const [accessType, setAccessType] = useState("")
    const [reason, setReason] = useState("")
    const [formError, setFormError] = useState({})

    const load = () => {
        ViolationAccessService.getStatus((data) => {
            setRequests(data.requests)
            setHasAccess(data.has_access)
        })
    }

    useEffect(() => { load() }, [])

    const openRequestForm = () => {
        setResource("")
        setAccessType("")
        setReason("")
        setFormError({})
        openForm(true)
    }

    const handleResourceChange = (e) => {
        setResource(e.target.value)
        setAccessType("") // the previous type may not be valid for the new resource (e.g. penalty has no "edit")
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const errors = {}
        if (!resource) errors.resource = "Please select which management area you need access to."
        if (!accessType) errors.access_type = "Please select the type of access you need."
        if (!reason.trim()) errors.reason = "Please explain why you need this access."
        setFormError(errors)
        if (Object.keys(errors).length > 0) return

        ViolationAccessService.requestAccess(
            { resource, access_type: accessType, reason },
            () => {
                openForm(false)
                showOutputModal("Access request sent to the prefect.", "s", () => load())
            },
            (err) => setFormError({ submit: err.response?.data?.message ?? "Failed to send request." })
        )
    }

    const handleCancel = (r) => {
        const isActive = r.status === "approved"
        showWarningModal(
            isActive
                ? `Are You Sure You Want To Give Up Your "${toTitleCase(r.access_type)}" Access To ${toTitleCase(r.resource)} Management?`
                : `Are You Sure You Want To Withdraw This "${toTitleCase(r.access_type)}" Request For ${toTitleCase(r.resource)} Management?`,
            isActive ? "Revoke Access" : "Withdraw Request",
            "Cancel",
            () => {
                ViolationAccessService.revoke(
                    r.id,
                    () => showOutputModal(isActive ? "Access revoked." : "Request withdrawn.", "s", () => load()),
                    (err) => showOutputModal(err.response?.data?.message ?? "Failed to revoke.", "e", () => {})
                )
            }
        )
    }

    const latestByKey = useMemo(() => {
        const map = {}
        for (const r of requests ?? []) {
            const key = `${r.resource}:${r.access_type}`
            if (!map[key]) map[key] = r
        }
        return map
    }, [requests])

    if (requests === null) return <div className="text-[0.85em] text-gray-500">Loading access status...</div>

    const activeTypes = ACCESS_TYPES_BY_RESOURCE[activeResource]

    return (
        <div className="grid gap-5 max-w-3xl">
            <UpModal close={showForm} closeModal={openForm} isEnableOuterClose={true} pd={["px-8", "py-6"]} bgColor="bg-white" w="w-[26rem]" cntr={true}>
                <form onSubmit={handleSubmit} className="w-full grid gap-4">
                    <h1 className="text-[1.1em]"><b>Request Violation/Penalty Edit Access</b></h1>
                    <DropdownField
                        default={{ val: "", label: "Select Management Area" }}
                        list={RESOURCES}
                        val={resource}
                        onChange={handleResourceChange}
                        name="resource"
                        error={formError.resource}
                    />
                    <DropdownField
                        default={{ val: "", label: "Select Type of Access" }}
                        list={resource ? ACCESS_TYPES_BY_RESOURCE[resource] : []}
                        val={accessType}
                        onChange={(e) => setAccessType(e.target.value)}
                        name="access_type"
                        titleCase={true}
                        error={formError.access_type}
                    />
                    <RichTextEditor
                        label="Reason"
                        val={reason}
                        change={setReason}
                        req={true}
                        error={formError.reason}
                        minHeight="10rem"
                    />
                    {formError.submit && <div className="text-[#d12323] text-[0.8em]">{formError.submit}</div>}
                    <FormButton type="submit" label="Send Request" />
                </form>
            </UpModal>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-semibold text-[1.05em]">Violation / Penalty Edit Access</h2>
                {mainTab === "request" && (
                    <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700" onClick={openRequestForm}>
                        Request Access
                    </ActionBtn>
                )}
            </div>

            <TabSwitcher
                tabs={[
                    { key: "request", label: "Request" },
                    { key: "history", label: "History" },
                ]}
                value={mainTab}
                onChange={setMainTab}
            />

            {mainTab === "request" && (
                <div className="bg-white rounded-md shadow-black/20 shadow-sm overflow-hidden">
                    <div className="px-5 pt-2">
                        <TabSwitcher
                            tabs={RESOURCES.map(({ val, label, icon }) => ({ key: val, label, icon }))}
                            value={activeResource}
                            onChange={setActiveResource}
                        />
                    </div>

                    <div className="p-5 grid gap-1">
                        {activeTypes.map(({ val, label, icon: Icon }) => {
                            const key = `${activeResource}:${val}`
                            const latest = latestByKey[key]
                            const active = hasAccess[activeResource]?.[val]
                            return (
                                <div key={key} className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 flex-shrink-0 grid place-items-center rounded-full bg-blue-50 text-blue-600">
                                            <Icon size={15} />
                                        </div>
                                        <span className="text-[0.9em] font-medium">{label}</span>
                                    </div>

                                    {active ? (
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            <span className="text-[0.8em] text-green-700 font-medium text-right">
                                                Active until {dt(latest.expires_at)}
                                            </span>
                                            <ActionBtn
                                                className="bg-gray-400 text-white hover:bg-gray-500"
                                                onClick={() => handleCancel(latest)}
                                            >
                                                Revoke
                                            </ActionBtn>
                                        </div>
                                    ) : latest ? (
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            <span className="text-[0.75em] text-gray-500">{readableDate(latest.created_at)}</span>
                                            <StatusChip status={latest.status} />
                                            {latest.status === "pending" && (
                                                <ActionBtn
                                                    className="bg-gray-400 text-white hover:bg-gray-500"
                                                    onClick={() => handleCancel(latest)}
                                                >
                                                    Cancel
                                                </ActionBtn>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[0.8em] text-gray-400">Never requested</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {mainTab === "history" && (
                <div className="bg-white rounded-md shadow-black/20 shadow-sm p-5 grid gap-3">
                    {requests.length === 0 ? (
                        <div className="text-[0.85em] text-gray-400 text-center py-6">No requests made yet.</div>
                    ) : (
                        <div className="grid gap-3">
                            {requests.map((r) => (
                                <div key={r.id} className="rounded-md border border-gray-100 bg-gray-50/60 p-3 grid gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap justify-between">
                                        <span className="text-[0.85em] font-semibold">
                                            {toTitleCase(r.resource)} <span className="text-gray-400 font-normal">—</span> {toTitleCase(r.access_type)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <StatusChip status={r.status} />
                                            {(r.status === "pending" || isActiveRow(r)) && (
                                                <ActionBtn
                                                    className="bg-gray-400 text-white hover:bg-gray-500"
                                                    onClick={() => handleCancel(r)}
                                                >
                                                    {r.status === "pending" ? "Cancel" : "Revoke"}
                                                </ActionBtn>
                                            )}
                                        </div>
                                    </div>
                                    {r.reason && (
                                        <div className="text-[0.8em] text-gray-600">{r.reason}</div>
                                    )}
                                    {r.status === "denied" && r.response_reason && (
                                        <div className="text-[0.8em] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
                                            Prefect's reason: {r.response_reason}
                                        </div>
                                    )}
                                    <div className="text-[0.7em] text-gray-400">
                                        Requested {dt(r.created_at)}
                                        {statusTimestamp(r) && ` • ${toTitleCase(r.status)} ${dt(statusTimestamp(r))}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ========================
// PREFECT: full roster + approve/deny/revoke
// ========================
const DenyReasonModal = ({ close, closeModal, onSubmit }) => {
    const [reason, setReason] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (close) { setReason(""); setError("") }
    }, [close])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!reason.trim()) {
            setError("Please explain why this request is being denied.")
            return
        }
        onSubmit(reason)
    }

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-8", "py-6"]} bgColor="bg-white" w="w-[26rem]" cntr={true}>
            <form onSubmit={handleSubmit} className="w-full grid gap-4">
                <h1 className="text-[1.1em]"><b>Deny Access Request</b></h1>
                <RichTextEditor
                    label="Reason for Denial"
                    val={reason}
                    change={setReason}
                    req={true}
                    error={error}
                    minHeight="10rem"
                />
                <FormButton type="submit" label="Send Denial" />
            </form>
        </UpModal>
    )
}

const RequestDetailModal = ({ close, closeModal, request }) => {
    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-8", "py-6"]} bgColor="bg-white" w="w-[28rem]" cntr={true}>
            {request && (
                <div className="w-full grid gap-4">
                    <div className="flex items-center gap-3">
                        <ProfilePic size={2.4} src={getProfilePic(request.requester_picture, request.requester_sex)} />
                        <div className="leading-tight">
                            <div className="font-semibold">{request.requester_name}</div>
                            <div className="text-gray-500 text-[0.85em]">{request.requester_username}</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{toTitleCase(request.resource)} Management</div>
                            <div className="text-gray-500 text-[0.85em]">{toTitleCase(request.access_type)} Access</div>
                        </div>
                        <StatusChip status={request.status} />
                    </div>

                    <div>
                        <div className="text-[0.75em] font-semibold text-gray-500 uppercase tracking-wide mb-1">Requester's Reason</div>
                        <div className="text-[0.85em] text-gray-700">{request.reason || "No reason given."}</div>
                    </div>

                    {request.status === "denied" && request.response_reason && (
                        <div>
                            <div className="text-[0.75em] font-semibold text-gray-500 uppercase tracking-wide mb-1">Denial Reason</div>
                            <div className="text-[0.85em] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">{request.response_reason}</div>
                        </div>
                    )}

                    <div>
                        <div className="text-[0.75em] font-semibold text-gray-500 uppercase tracking-wide mb-1">Timeline</div>
                        <div className="grid gap-0.5 text-[0.8em] text-gray-600">
                            <span>Requested: {dt(request.created_at)}</span>
                            {statusTimestamp(request) && <span>{toTitleCase(request.status)}: {dt(statusTimestamp(request))}</span>}
                            {request.expires_at && <span>Expires: {dt(request.expires_at)}</span>}
                        </div>
                    </div>
                </div>
            )}
        </UpModal>
    )
}

const PrefectAccessPanel = () => {
    const [list, setList] = useState(null)
    const [denyModal, openDenyModal] = useState(false)
    const [denyTarget, setDenyTarget] = useState(null)
    const [viewModal, openViewModal] = useState(false)
    const [viewTarget, setViewTarget] = useState(null)

    const openView = (row) => {
        setViewTarget(row)
        openViewModal(true)
    }

    const load = () => {
        ViolationAccessService.getList(setList)
    }

    useEffect(() => { load() }, [])

    const rows = useMemo(() => (list ?? []).map((e) => ({
        id: e.id,
        requester_name: `${e.requester?.profile?.first_name ?? ""} ${e.requester?.profile?.last_name ?? ""}`.trim() || e.requester?.username,
        requester_username: e.requester?.username,
        requester_picture: e.requester?.profile?.profile_picture,
        requester_sex: e.requester?.profile?.sex,
        resource: e.resource,
        access_type: e.access_type,
        reason: e.reason,
        response_reason: e.response_reason,
        status: e.status,
        created_at: e.created_at,
        approved_at: e.approved_at,
        denied_at: e.denied_at,
        revoked_at: e.revoked_at,
        used_at: e.used_at,
        expires_at: e.expires_at,
    })), [list])

    const handleApprove = (row) => {
        ViolationAccessService.approve(
            row.id,
            () => showOutputModal("Access approved.", "s", () => load()),
            (err) => showOutputModal(err.response?.data?.message ?? "Failed to approve.", "e", () => {})
        )
    }
    const openDeny = (row) => {
        setDenyTarget(row)
        openDenyModal(true)
    }
    const handleDenySubmit = (reason) => {
        ViolationAccessService.deny(
            denyTarget.id,
            reason,
            () => {
                openDenyModal(false)
                showOutputModal("Access denied.", "s", () => load())
            },
            (err) => showOutputModal(err.response?.data?.message ?? "Failed to deny.", "e", () => {})
        )
    }
    const columns = [
        {
            field: "requester_name",
            headerName: "Super Admin",
            flex: 1,
            minWidth: 210,
            renderCell: ({ row }) => (
                <div className="flex items-center gap-2 h-full">
                    <ProfilePic
                        size={1.9}
                        src={getProfilePic(row.requester_picture, row.requester_sex)}
                    />
                    <div className="leading-tight">
                        <div className="font-medium text-[0.9em]">{row.requester_name}</div>
                        <div className="text-gray-500 text-[0.8em]">{row.requester_username}</div>
                    </div>
                </div>
            ),
        },
        {
            field: "request",
            headerName: "Request",
            width: 160,
            renderCell: ({ row }) => (
                <div className="leading-tight py-1">
                    <div className="font-medium">{toTitleCase(row.resource)}</div>
                    <div className="text-gray-500 text-[0.85em]">{toTitleCase(row.access_type)}</div>
                </div>
            ),
        },
        {
            field: "status",
            headerName: "Status",
            width: 150,
            renderCell: ({ row }) => (
                <div className="flex flex-col gap-1 py-2">
                    <StatusChip status={row.status} />
                    {row.status === "denied" && row.response_reason && (
                        <span className="text-[0.7em] text-gray-500 whitespace-normal">{row.response_reason}</span>
                    )}
                </div>
            ),
        },
        {
            field: "timeline",
            headerName: "Timeline",
            width: 200,
            renderCell: ({ row }) => (
                <div className="flex flex-col gap-0.5 py-2 text-[0.75em] text-gray-500">
                    <span>Requested: {dt(row.created_at)}</span>
                    {statusTimestamp(row) && <span>{toTitleCase(row.status)}: {dt(statusTimestamp(row))}</span>}
                    {row.expires_at && <span>Expires: {dt(row.expires_at)}</span>}
                </div>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 280,
            sortable: false,
            renderCell: ({ row }) => (
                <div className="flex gap-2 items-center h-full">
                    <ActionBtn className="bg-gray-600 text-white hover:bg-gray-700" onClick={() => openView(row)}>View</ActionBtn>
                    {row.status === "pending" && (
                        <>
                            <ActionBtn className="bg-green-600 text-white hover:bg-green-700" onClick={() => handleApprove(row)}>Approve</ActionBtn>
                            <ActionBtn className="bg-red-600 text-white hover:bg-red-700" onClick={() => openDeny(row)}>Deny</ActionBtn>
                        </>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
            <RequestDetailModal close={viewModal} closeModal={openViewModal} request={viewTarget} />
            <DenyReasonModal close={denyModal} closeModal={openDenyModal} onSubmit={handleDenySubmit} />
            <div className="w-full px-5 py-3 min-w-0">
                <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        getRowId={(row) => row.id}
                        disableRowSelectionOnClick
                        showToolbar
                        hideFooterSelectedRowCount
                        pagination
                        getRowHeight={() => "auto"}
                        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                        pageSizeOptions={[20, 50, 100]}
                        localeText={{ noRowsLabel: "No Access Requests Yet" }}
                        sx={{
                            "& .MuiDataGrid-toolbarContainer": {
                                minHeight: "2.75rem",
                                paddingBlock: "0.4rem",
                            },
                        }}
                    />
                </Box>
            </div>
        </div>
    )
}

export default ViolationAccessRequests
