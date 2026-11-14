import UpNextPanel from "./up-next-panel"

// A user's "My requests" panel on their dashboard: the prefect's "Up next"
// design, one column per kind, each showing their earliest request still
// open and its status. `data` is DashboardController::myRequests():
// [{ key, any, item: { number, detail, status, created_at } | null }].
const KINDS = {
    complaint: { label: "My complaint", href: "/complaint", noun: "complaints", statusLinks: true, titleCaseDetail: true },
    referral: { label: "My referral", href: "/referral", noun: "referrals" },
    absent_form: { label: "My absent form", href: "/absent-form", noun: "absent forms" },
    gatepass: { label: "My gate pass", href: "/gatepass", noun: "gate passes" },
}
const STATUS = { pending: "Pending", ongoing: "Ongoing" }

const MyRequestsPanel = ({ data = [], stacked = false, className = "" }) => (
    <UpNextPanel
        title="My requests"
        stacked={stacked}
        className={className}
        columns={data.filter((d) => KINDS[d.key]).map((d) => {
            const k = KINDS[d.key]
            return {
                key: d.key,
                label: k.label,
                meta: d.item ? STATUS[d.item.status] ?? d.item.status : null,
                // ?id=<encrypted id>: the page lists only that request.
                href: d.item
                    ? `${k.href}?${k.statusLinks ? `status=${d.item.status}&` : ""}id=${d.item.encrypted_id}`
                    : k.href,
                item: d.item,
                titleCaseDetail: k.titleCaseDetail,
                empty: d.any ? `No ${k.noun} waiting` : `No ${k.noun} yet`,
            }
        })}
    />
)

export default MyRequestsPanel
