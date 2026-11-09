import { toTitleCase } from "@/others/function";

// Solid status badge for the record tables (complaints, referrals, absent
// forms, gate passes): white text on the status's color, fully rounded.
const STATUS_COLORS = {
    pending: "bg-yellow-500",
    ongoing: "bg-orange-500",
    resolved: "bg-green-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    revoked: "bg-gray-500",
};

const StatusPill = ({ status }) => {
    const s = status || "pending";
    return (
        <span className={`inline-block px-2 py-1 text-white rounded-xl leading-none whitespace-nowrap ${STATUS_COLORS[s] ?? "bg-gray-500"}`}>
            {toTitleCase(s)}
        </span>
    );
};

export default StatusPill;
