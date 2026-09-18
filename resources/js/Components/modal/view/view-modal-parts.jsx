import { getProfilePic, toTitleCase } from "../../../others/function"
import SelectedUser from "../../other/selected-user"
import { Link } from "@inertiajs/react"

// Shared building blocks for the "view [record]" modals (complaint, referral,
// absent form, gate pass, ...) — one consistent card/timeline/status-badge
// language instead of every modal hand-rolling its own layout.

export const StatusBadge = ({ status, styles }) => (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shrink-0 ${styles[status] ?? 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200'}`}>
        {toTitleCase(status) || 'Pending'}
    </span>
)

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
export const PersonList = ({ data, data_list = null, emptyLabel = 'No one on record.' }) => {
    if (data_list != null && data_list.length !== 0) {
        return (
            <div className="grid gap-1">
                {data_list.map((e, i) => (
                    <Link key={e.user?.id ?? i} href={`/profile/${e.user.username}`} className="block">
                        <SelectedUser
                            src={getProfilePic(e.user.profile?.profile_picture, e.user.profile?.sex)}
                            name={[e.user.profile?.first_name, e.user.profile?.last_name]}
                            user={e.user}
                        />
                    </Link>
                ))}
            </div>
        )
    }

    if (data == null) {
        return <div className="text-sm text-gray-500">{emptyLabel}</div>
    }

    return (
        <Link href={`/profile/${data.username}`} className="block">
            <SelectedUser
                src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
                name={[data.profile?.first_name, data.profile?.last_name]}
                user={data}
            />
        </Link>
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
