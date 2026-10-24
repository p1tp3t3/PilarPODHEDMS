import { useEffect, useMemo, useState } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import { Box, Chip, Checkbox, FormControlLabel } from "@mui/material"
import { AlertTriangle, ClipboardList, KeyRound, ShieldCheck, Clock } from "lucide-react"
import ActionBtn from "@/Components/button/action-btn"
import FormButton from "@/Components/button/button"
import DropdownField from "@/Components/input/dropdown"
import RichTextEditor from "@/Components/input/rich-text-editor"
import { isBlank, maxLength } from "@/others/validation"
import UpModal from "@/Components/modal/up-modal"
import { ViolationAccessService } from "@/others/services/violation-access-service"
import { readableDate, readableTime, showOutputModal, showWarningModal, toTitleCase , showLoadingModal } from "@/others/function"

// Edit access to the violation / penalty catalog. The prefect GIVES the IT
// admin (super admin) access directly — no request — scoped per action and
// for a chosen length of time, and can revoke it at any time.
// Backend: ViolationAccessController (grant / index / status / revoke).

const PERMISSIONS = [
    { resource: "violation", label: "Violations", icon: AlertTriangle, actions: ["add", "edit", "delete"] },
    { resource: "penalty", label: "Penalties", icon: ClipboardList, actions: ["add", "delete"] },
]

const DURATION_LABEL = { 30: "30 minutes", 60: "1 hour", 240: "4 hours", 480: "8 hours", 1440: "1 day", 4320: "3 days", 10080: "7 days" }

const hasUsesLeft = (r) => r.max_uses == null || (r.uses_count ?? 0) < r.max_uses
const isActive = (r) => r.status === "approved" && r.expires_at && new Date(r.expires_at) > new Date() && hasUsesLeft(r)
// "2 of 3 used" for a limited grant, "Used 2 times" / "Not used yet" otherwise.
const usageLabel = (r) => {
    const n = r.uses_count ?? 0
    if (r.max_uses != null) return `${n} of ${r.max_uses} ${r.max_uses === 1 ? "use" : "uses"} used`
    return n ? `Used ${n} ${n === 1 ? "time" : "times"} (no limit)` : "No limit on uses"
}
const USE_LABEL = { 1: "Once", 3: "3 times", 5: "5 times", 10: "10 times" }
// What the row is now: an approved grant past its time shows as expired.
const shownStatus = (r) => (r.status === "approved" && !isActive(r) ? "expired" : r.status)

const STATUS_COLOR = {
    approved: { bg: "#dcfce7", fg: "#15803d", label: "Active" },
    expired: { bg: "#f3f4f6", fg: "#6b7280", label: "Expired" },
    revoked: { bg: "#f3f4f6", fg: "#6b7280", label: "Revoked" },
    used: { bg: "#e0e7ff", fg: "#4338ca", label: "Used up" },
    pending: { bg: "#fef3c7", fg: "#b45309", label: "Pending (old request)" },
    denied: { bg: "#fee2e2", fg: "#b91c1c", label: "Denied" },
}

const StatusChip = ({ status }) => {
    const c = STATUS_COLOR[status] ?? STATUS_COLOR.expired
    return <Chip label={c.label} size="small" sx={{ fontWeight: 600, backgroundColor: c.bg, color: c.fg }} />
}

// Notes are rich text — shown as plain text in lists.
const plainText = (html) => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
const permissionLabel = (r) => `${toTitleCase(r.access_type)} ${r.resource === "penalty" ? "penalties" : "violations"}`
const personName = (u) => [u?.profile?.first_name, u?.profile?.last_name].filter(Boolean).join(" ") || "—"
const when = (d) => (d ? `${readableDate(d)} (${readableTime(d)})` : "—")

// "in 3h 20m" / "in 12m"
const timeLeft = (d) => {
    const mins = Math.max(0, Math.round((new Date(d) - new Date()) / 60000))
    if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h left`
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m left`
    return `${mins}m left`
}

// giveOpen / setGiveOpen: the page's title-bar "Give Access" button opens the form.
const ViolationAccessRequests = ({ user, giveOpen, setGiveOpen }) => {
    const isPrefect = user?.role === "sub_admin"
    return isPrefect ? <PrefectView giveOpen={giveOpen} setGiveOpen={setGiveOpen} /> : <AdminView />
}

// ---------------------------------------------------------------------------
// Prefect: give access, see active access, revoke, history
// ---------------------------------------------------------------------------
const PrefectView = ({ giveOpen = false, setGiveOpen = () => {} }) => {
    const [state, setState] = useState(null) // { grants, admins, durations }
    // Access always goes to the IT admin account(s) — no one to choose.
    const [form, setForm] = useState({ perms: {}, duration: 60, max_uses: "unlimited", note: "" })
    const [errors, setErrors] = useState({})
    // The form starts fresh each time it opens.
    useEffect(() => {
        if (!giveOpen) return
        setForm((f) => ({ ...f, perms: {}, duration: 60, max_uses: "unlimited", note: "" }))
        setErrors({})
    }, [giveOpen])

    const load = () => ViolationAccessService.getList(setState)
    useEffect(() => { load() }, [])

    const grants = state?.grants ?? []
    const active = useMemo(() => grants.filter(isActive), [grants])

    const togglePerm = (key) => {
        setForm((f) => ({ ...f, perms: { ...f.perms, [key]: !f.perms[key] } }))
        setErrors((e) => ({ ...e, perms: undefined }))
    }

    const give = () => {
        const permissions = Object.entries(form.perms).filter(([, on]) => on).map(([key]) => {
            const [resource, access_type] = key.split(".")
            return { resource, access_type }
        })
        const found = {}
        if (permissions.length === 0) found.perms = "Choose at least one action."
        const noteError = maxLength(1000, "The note")(form.note)
        if (noteError) found.note = noteError
        setErrors(found)
        if (Object.keys(found).length) return

        showWarningModal(
            `Give the IT admin access to ${permissions.map(permissionLabel).join(", ")} for ${DURATION_LABEL[form.duration]}${form.max_uses === "unlimited" ? "" : `, ${USE_LABEL[form.max_uses] ?? `${form.max_uses} times`} each`}?`,
            "Give Access",
            "Cancel",
            () => { showLoadingModal("Giving access"); ViolationAccessService.grant(
                { permissions, duration_minutes: form.duration, max_uses: form.max_uses === "unlimited" ? null : form.max_uses, note: isBlank(form.note) ? null : form.note },
                () => {
                    setGiveOpen(false)
                    showOutputModal("Access Given", "s", () => {})
                    load()
                },
                (e) => showOutputModal(e?.response?.data?.message || "Failed to give access.", "e", () => {}),
            ) },
        )
    }

    const revoke = (row) => showWarningModal(
        `Remove ${personName(row.requester)}'s "${permissionLabel(row)}" access now?`,
        "Revoke Access",
        "Cancel",
        () => { showLoadingModal("Revoking access"); ViolationAccessService.revoke(
            row.id,
            () => { showOutputModal("Access Revoked", "s", () => {}); load() },
            (e) => showOutputModal(e?.response?.data?.message || "Failed to revoke access.", "e", () => {}),
        ) },
    )

    if (!state) return <div className="h-64 rounded-md bg-white animate-pulse" />

    return (
        <div className="grid gap-5">
            <p className="text-[0.85em] text-gray-500 max-w-[40rem]">
                Give the IT admin time-limited access to change the violation or penalty list. You can revoke it anytime.
            </p>

            {/* Give access (modal) */}
            <UpModal close={giveOpen} closeModal={setGiveOpen} isEnableOuterClose={true} cntr={true} w="w-[95%] sm:w-[46rem]" pd={["px-5", "py-6"]}>
            <div className="grid gap-4">
                <div className="flex items-start gap-3 pr-6">
                    <span className="w-10 h-10 shrink-0 rounded-full bg-blue-50 text-blue-700 grid place-items-center"><KeyRound size={18} /></span>
                    <div>
                        <h2 className="font-semibold text-gray-900">Give Edit Access</h2>
                        <p className="text-[0.85em] text-gray-500">
                            Let the IT admin change the violation or penalty list for a limited time, optionally only a few times. It ends when the time or the uses run out, and you can revoke it anytime.
                        </p>
                    </div>
                </div>

                {state.admins.length === 0 ? (
                    <p className="text-[0.85em] text-gray-500">There's no IT admin account to give access to.</p>
                ) : (
                    <>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[0.8em] font-semibold text-gray-700 mb-1">For how long</p>
                                <DropdownField
                                    list={(state.durations ?? [60]).map((m) => ({ val: m, label: DURATION_LABEL[m] ?? `${m} minutes` }))}
                                    val={form.duration}
                                    onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                                    keepCase={true}
                                />
                            </div>
                            <div>
                                <p className="text-[0.8em] font-semibold text-gray-700 mb-1">How many times (each action)</p>
                                <DropdownField
                                    list={[
                                        ...(state.use_limits ?? [1, 3, 5, 10]).map((n) => ({ val: n, label: USE_LABEL[n] ?? `${n} times` })),
                                        { val: "unlimited", label: "No limit (until time ends)" },
                                    ]}
                                    val={form.max_uses}
                                    onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value === "unlimited" ? "unlimited" : Number(e.target.value) }))}
                                    keepCase={true}
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-[0.8em] font-semibold text-gray-700 mb-1">What they can do</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {PERMISSIONS.map((g) => {
                                    const Icon = g.icon
                                    return (
                                        <div key={g.resource} className="rounded-lg border border-gray-200 px-3 py-2">
                                            <p className="flex items-center gap-2 text-[0.85em] font-semibold text-gray-800"><Icon size={15} className="text-gray-500" /> {g.label}</p>
                                            <div className="flex flex-wrap gap-x-4">
                                                {g.actions.map((a) => {
                                                    const key = `${g.resource}.${a}`
                                                    return (
                                                        <FormControlLabel
                                                            key={key}
                                                            control={<Checkbox size="small" checked={!!form.perms[key]} onChange={() => togglePerm(key)} />}
                                                            label={<span className="text-[0.85em]">{toTitleCase(a)}</span>}
                                                        />
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {errors.perms && <p className="text-[#d12323] text-[13px] font-[600] mt-1">{errors.perms}</p>}
                        </div>

                        <RichTextEditor

                            label="Note (optional) — e.g. why access is given"

                            val={form.note}

                            change={(html) => { setForm((f) => ({ ...f, note: html })); setErrors((x) => ({ ...x, note: undefined })) }}

                            error={errors.note}

                            minHeight="7rem"

                        />

                        <div className="flex justify-end">
                            <FormButton type="button" label="Give Access" click={give} />
                        </div>
                    </>
                )}
            </div>
            </UpModal>

            {/* Active access */}
            <div className="bg-white rounded-md shadow-sm shadow-black/20 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Active Access</h2>
                {active.length === 0 ? (
                    <p className="text-[0.85em] text-gray-500">The IT admin has no edit access right now.</p>
                ) : (
                    <div className="grid gap-2">
                        {active.map((r) => (
                            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-green-100 bg-green-50 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="text-[0.9em] font-semibold text-gray-800">{permissionLabel(r)} <span className="font-normal text-gray-500">· {personName(r.requester)}</span></p>
                                    <p className="text-[0.75em] text-gray-500 flex items-center gap-1"><Clock size={12} /> Until {when(r.expires_at)} · {timeLeft(r.expires_at)} · {usageLabel(r)}</p>
                                </div>
                                <ActionBtn className="bg-red-600 text-white hover:bg-red-700" onClick={() => revoke(r)}>Revoke</ActionBtn>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <HistoryTable rows={grants} showAdmin={true} />
        </div>
    )
}

// ---------------------------------------------------------------------------
// IT admin: what access they have right now + history
// ---------------------------------------------------------------------------
const AdminView = () => {
    const [rows, setRows] = useState(null)
    useEffect(() => { ViolationAccessService.getStatus((d) => setRows(d.requests ?? [])) }, [])

    if (!rows) return <div className="h-48 rounded-md bg-white animate-pulse" />
    const active = rows.filter(isActive)

    return (
        <div className="grid gap-5">
            <div className="bg-white rounded-md shadow-sm shadow-black/20 p-5">
                <div className="flex items-start gap-3 mb-3">
                    <span className="w-10 h-10 shrink-0 rounded-full bg-blue-50 text-blue-700 grid place-items-center"><ShieldCheck size={18} /></span>
                    <div>
                        <h2 className="font-semibold text-gray-900">Your Edit Access</h2>
                        <p className="text-[0.85em] text-gray-500">The prefect gives you access to change the violation and penalty lists. It ends on its own at the time shown.</p>
                    </div>
                </div>
                {active.length === 0 ? (
                    <p className="text-[0.85em] text-gray-500">You don't have edit access right now. Ask the prefect if you need to change something.</p>
                ) : (
                    <div className="grid gap-2">
                        {active.map((r) => (
                            <div key={r.id} className="rounded-md border border-green-100 bg-green-50 px-3 py-2">
                                <p className="text-[0.9em] font-semibold text-gray-800">{permissionLabel(r)}</p>
                                <p className="text-[0.75em] text-gray-500 flex items-center gap-1"><Clock size={12} /> Until {when(r.expires_at)} · {timeLeft(r.expires_at)} · {usageLabel(r)}</p>
                                {!isBlank(r.reason) && <p className="text-[0.8em] text-gray-600 mt-1">Note: {plainText(r.reason)}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <HistoryTable rows={rows} showAdmin={false} />
        </div>
    )
}

const HistoryTable = ({ rows, showAdmin }) => {
    const columns = [
        { field: "permission", headerName: "Access", flex: 1, minWidth: 160, valueGetter: (v, r) => permissionLabel(r) },
        ...(showAdmin ? [{ field: "admin", headerName: "IT Admin", flex: 1, minWidth: 150, valueGetter: (v, r) => personName(r.requester) }] : []),
        { field: "given", headerName: "Given", flex: 1, minWidth: 170, valueGetter: (v, r) => when(r.approved_at ?? r.created_at) },
        { field: "until", headerName: "Until", flex: 1, minWidth: 170, valueGetter: (v, r) => when(r.revoked_at ?? r.expires_at) },
        { field: "uses", headerName: "Uses", width: 170, valueGetter: (v, r) => (r.max_uses != null ? `${r.uses_count ?? 0} of ${r.max_uses}` : `${r.uses_count ?? 0} (no limit)`) },
        { field: "status", headerName: "Status", width: 170, renderCell: (p) => <div className="h-full flex items-center"><StatusChip status={shownStatus(p.row)} /></div> },
        { field: "reason", headerName: "Note", flex: 1.2, minWidth: 180, valueGetter: (v, r) => (isBlank(r.reason) ? "—" : plainText(r.reason)) },
    ]
    return (
        <div className="bg-white rounded-md shadow-sm shadow-black/20 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">History</h2>
            <Box sx={{ width: "100%", minWidth: 0 }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    getRowId={(r) => r.id}
                    autoHeight
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    pageSizeOptions={[10, 20]}
                    disableRowSelectionOnClick
                    mobileSummary={(r) => ({ name: permissionLabel(r), role: `${when(r.approved_at ?? r.created_at)} · ${STATUS_COLOR[shownStatus(r)]?.label ?? ""}` })}
                />
            </Box>
        </div>
    )
}

export default ViolationAccessRequests
