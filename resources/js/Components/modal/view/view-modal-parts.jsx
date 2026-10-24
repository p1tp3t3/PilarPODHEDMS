import { getProfilePic, toTitleCase, profileUrl } from "../../../others/function"
import SelectedUser from "../../other/selected-user"
import { Link, usePage } from "@inertiajs/react"

// Shared building blocks for the "view [record]" modals (complaint, referral,
// absent form, gate pass, ...) — one consistent card/timeline/status-badge
// language instead of every modal hand-rolling its own layout.

export const StatusBadge = ({ status, styles }) => (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shrink-0 ${styles[status] ?? 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200'}`}>
        {toTitleCase(status) || 'Pending'}
    </span>
)

// Whether the signed-in user is the one who filed/owns the record.
export const useIsOwner = (ownerId) => {
    const viewerId = usePage().props.auth?.user?.id
    return ownerId != null && viewerId != null && String(ownerId) === String(viewerId)
}

// "Your Complaint" when the viewer filed it, otherwise "Sarai's Complaint".
export const useOwnerTitle = (ownerId, name, noun, fallback = "Student") =>
    useIsOwner(ownerId) ? `Your ${noun}` : `${name || fallback}'s ${noun}`

export const ModalHeader = ({ title, reference, status, styles }) => (
    <div className="rounded-t-md bg-gray-50 border-b px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
                {reference && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <span className="font-mono">#{reference}</span>
                    </div>
                )}
            </div>
            {status !== undefined && <StatusBadge status={status} styles={styles} />}
        </div>
    </div>
)

export const Section = ({ icon: Icon, title, children, tone = 'border-gray-200' }) => (
    <div className={`rounded-xl border ${tone} bg-white p-4 sm:p-5`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            <Icon size={16} className="text-gray-400 shrink-0" />
            {title}
        </h2>
        {children}
    </div>
)

export const Stat = ({ icon: Icon, label, value, sub }) => (
    <div className="flex items-start gap-2.5">
        <div className="mt-0.5 rounded-md bg-gray-100 p-1.5">
            <Icon size={14} className="text-gray-500" />
        </div>
        <div className="min-w-0">
            <div className="text-[0.7rem] uppercase tracking-wide text-gray-400 font-medium">{label}</div>
            <div className="text-sm font-medium text-gray-800 truncate">{value}</div>
            {sub && <div className="text-[0.7rem] text-gray-400 truncate">{sub}</div>}
        </div>
    </div>
)

export const StatGrid = ({ children }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        {children}
    </div>
)

// One or more "person" rows — a single user, a list of users (e.g. multiple
// referred students), or a graceful empty state when neither is present
// (a record left with no resolvable subject shouldn't crash the modal).
// `linkable` = false shows the person without a link to their profile.
export const PersonList = ({ data, data_list = null, emptyLabel = 'No one on record.', linkable = true }) => {
    const Wrap = ({ user, children }) => linkable
        ? <Link href={profileUrl(user)} className="block">{children}</Link>
        : <div className="block">{children}</div>

    if (data_list != null && data_list.length !== 0) {
        return (
            <div className="grid gap-1">
                {data_list.map((e, i) => (
                    <Wrap key={e.user?.id ?? i} user={e.user}>
                        <SelectedUser
                            src={getProfilePic(e.user.profile?.profile_picture, e.user.profile?.sex)}
                            name={[e.user.profile?.first_name, e.user.profile?.last_name]}
                            user={e.user}
                        />
                    </Wrap>
                ))}
            </div>
        )
    }

    if (data == null) {
        return <div className="text-sm text-gray-500">{emptyLabel}</div>
    }

    return (
        <Wrap user={data}>
            <SelectedUser
                src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
                name={[data.profile?.first_name, data.profile?.last_name]}
                user={data}
            />
        </Wrap>
    )
}

// Defensive against non-string/malformed values from the backend (a bad
// JSON.parse here throws synchronously during render and blanks the whole
// modal) — always resolves to an array, never throws.
export const safeParseArray = (value) => {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string' || value === '') return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

// "Filed/Issued by the Prefect: <name>" under the person a record is for,
// when a prefect entered it on their behalf (the record's `prefect`).
export const ByPrefect = ({ prefect, label = "Filed by the Prefect" }) => {
    if (!prefect) return null
    const name = [prefect.profile?.first_name, prefect.profile?.last_name].filter(Boolean).join(" ") || prefect.username
    return (
        <p className="mt-3 pt-3 border-t border-gray-100 text-[0.8em] text-gray-500">
            {label}: <span className="font-semibold text-gray-800">{name}</span>
        </p>
    )
}

// Placeholder shown while a view modal's data is loading from the server,
// shaped like what's coming instead of a spinner:
//   "record" — header, stat boxes, then sections (complaint, referral, ...)
//   "list"   — a few stacked rows (incident / violation / appointment lists)
//   "table"  — a header row plus table rows (file previews)
//   "compact"— a short card (appointment details)
const Bar = ({ className = "" }) => <div className={`bg-gray-200 rounded animate-pulse ${className}`} />

export const ViewModalSkeleton = ({ variant = "record" }) => {
    if (variant === "list") {
        return (
            <div className="grid gap-3 py-2" aria-busy="true" aria-label="Loading">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg px-4 py-3">
                        <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
                        <div className="flex-1 grid gap-2">
                            <Bar className="h-3 w-1/2" />
                            <Bar className="h-3 w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (variant === "table") {
        return (
            <div className="grid gap-2 py-2" aria-busy="true" aria-label="Loading">
                <Bar className="h-8 w-full" />
                {[0, 1, 2, 3, 4].map((i) => <Bar key={i} className="h-6 w-full opacity-70" />)}
            </div>
        )
    }

    if (variant === "compact") {
        return (
            <div className="grid gap-3" aria-busy="true" aria-label="Loading">
                <Bar className="h-5 w-2/3" />
                <Bar className="h-3 w-1/3" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Bar className="h-12" />
                    <Bar className="h-12" />
                </div>
            </div>
        )
    }

    return (
        <div aria-busy="true" aria-label="Loading">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 grid gap-2">
                    <Bar className="h-4 w-1/2" />
                    <Bar className="h-3 w-1/4" />
                </div>
                <Bar className="h-6 w-20 rounded-full" />
            </div>
            <div className="px-6 py-5 grid gap-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => <Bar key={i} className="h-14" />)}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <Bar className="h-24" />
                    <Bar className="h-24" />
                </div>
                <Bar className="h-20" />
            </div>
        </div>
    )
}
