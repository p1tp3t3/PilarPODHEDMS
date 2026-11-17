import { toTitleCase } from "@/others/function";

// Status badge for the record tables (complaints, referrals, absent forms,
// gate passes): a soft tint with the status's colour as text and border, the
// same look as the badges in the view modals. The tints are CSS variables
// (--tone-*, resources/css/app.css) with light and dark values.
const STATUS_TONE = {
    pending: "yellow",
    ongoing: "orange",
    resolved: "green",
    approved: "green",
    rejected: "red",
    revoked: "gray",
    expired: "gray",
    // Not request statuses, but shown in other tables' Status columns the
    // same way: violations (major / minor), roles and school years.
    major: "red",
    minor: "amber",
    active: "green",
    inactive: "gray",
    ended: "gray",
    archived: "gray",
    // Security monitor severities.
    high: "red",
    medium: "orange",
    low: "gray",
};

export const toneStyle = (tone) => ({
    backgroundColor: `var(--tone-${tone}-bg)`,
    color: `var(--tone-${tone}-fg)`,
    border: `1px solid var(--tone-${tone}-bd)`,
});

const StatusPill = ({ status, fallback = "pending" }) => {
    const s = String(status || fallback).toLowerCase();
    return (
        <span
            className="inline-block px-2 py-1 rounded-xl leading-none whitespace-nowrap font-medium"
            style={toneStyle(STATUS_TONE[s] ?? "gray")}
        >
            {toTitleCase(s)}
        </span>
    );
};

export default StatusPill;
