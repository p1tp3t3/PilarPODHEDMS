import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { AlertCircle } from "lucide-react";
import { Box, Chip, Divider, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { ViewModalSkeleton } from "@/Components/modal/view/view-modal-parts";
import { readableDate, readableTime } from "@/others/function";

// A notification's own page (the bell → one notification), in one card.
// Shared by every page in Pages/shared/notification.
const TONE = { default: "blue", success: "green", danger: "red", warning: "amber" };
const tone = (t) => TONE[t] ?? TONE.default;
const toneSx = (t) => ({
    bgcolor: `var(--tone-${tone(t)}-bg)`,
    color: `var(--tone-${tone(t)}-fg)`,
    border: 1,
    borderColor: `var(--tone-${tone(t)}-bd)`,
});

const when = (at) => (at ? `${readableDate(at)} • ${readableTime(at)}` : null);

// When the notification arrived (the page's `notif`).
const useReceivedAt = () => when(usePage().props.notif?.created_at);

const Shell = ({ children }) => (
    <Box sx={{ width: "100%", maxWidth: 820, mx: "auto", py: { xs: 2, sm: 4 } }}>{children}</Box>
);

const Card = ({ children, sx }) => (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", ...sx }}>{children}</Paper>
);

/**
 * A notification with its own message: a header (icon, title, time,
 * status) and the message below.
 */
const NotifDetailCard = ({ icon: Icon, tone: t = "default", title, timestamp, statusBadge, actions, children }) => {
    const received = useReceivedAt();

    return (
        <Shell>
            <Card>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1.75, px: { xs: 2, sm: 3 }, py: 2, bgcolor: "action.hover" }}>
                    {Icon && (
                        <Box sx={{ ...toneSx(t), width: 40, height: 40, borderRadius: 2, flexShrink: 0, display: "grid", placeItems: "center" }}>
                            <Icon size={20} strokeWidth={2} />
                        </Box>
                    )}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography component="h1" sx={{ fontSize: "1.05rem", fontWeight: 700, color: "text.primary", lineHeight: 1.35 }}>
                            {title}
                        </Typography>
                        {(timestamp || received) && (
                            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.25 }}>{timestamp || received}</Typography>
                        )}
                    </Box>
                    {statusBadge && (
                        <Chip size="small" label={statusBadge.label} sx={{ ...toneSx(statusBadge.tone), fontWeight: 600, flexShrink: 0 }} />
                    )}
                </Stack>

                {children && (
                    <>
                        <Divider />
                        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>{children}</Box>
                    </>
                )}

                {actions && (
                    <>
                        <Divider />
                        <Stack direction={{ xs: "column-reverse", sm: "row" }} sx={{ gap: 1.5, justifyContent: "flex-end", px: { xs: 2, sm: 3 }, py: 2 }}>
                            {actions}
                        </Stack>
                    </>
                )}
            </Card>
        </Shell>
    );
};

/**
 * A notification about a record (complaint, referral, absent form, gate
 * pass): the record's own view, which already has its title, reference
 * and status, so no second header here.
 */
export const NotifRecordCard = ({ children }) => {
    const received = useReceivedAt();
    return (
        <Shell>
            {received && (
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1, px: 0.5 }}>
                    Notification received {received}
                </Typography>
            )}
            <Card>{children}</Card>
        </Shell>
    );
};

// Label on the left, value on the right (one line of a notification's details).
export const NotifRow = ({ label, children }) => (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, py: 1, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
        <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>{label}</Typography>
        <Typography component="div" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary", textAlign: "right" }}>{children}</Typography>
    </Stack>
);

// The sender line at the foot of a message.
export const NotifSignature = ({ lines }) => (
    <Box sx={{ mt: 2.5, pt: 2, borderTop: 1, borderColor: "divider" }}>
        {lines.map((l, i) => (
            <Typography key={i} sx={{ fontSize: "0.85rem", color: "text.secondary", fontWeight: i === 0 ? 600 : 400 }}>{l}</Typography>
        ))}
    </Box>
);

export const NotifEmptyState = ({ icon: Icon, message }) => (
    <Shell>
        <Card sx={{ py: 8, px: 3, display: "grid", placeItems: "center", textAlign: "center" }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "action.hover", color: "text.disabled", display: "grid", placeItems: "center", mb: 2 }}>
                {Icon ? <Icon size={26} /> : <AlertCircle size={26} />}
            </Box>
            <Typography component="h1" sx={{ fontSize: "1.05rem", fontWeight: 600, color: "text.secondary" }}>{message}</Typography>
            <Typography sx={{ fontSize: "0.875rem", color: "text.disabled", mt: 0.5 }}>It may have been removed or archived.</Typography>
        </Card>
    </Shell>
);

// While the record loads: the card's shape as a skeleton (no spinner).
export const NotifLoadingState = () => (
    <Shell>
        <Skeleton width={220} height={18} sx={{ mb: 1, mx: 0.5 }} />
        <Card>
            <ViewModalSkeleton />
        </Card>
    </Shell>
);

/**
 * The record a notification page shows, fetched by its id from the URL
 * (?complaint_id=, ?referral_id= ...): null while loading, '' when none.
 * Fetched again (skeleton first) whenever another notification is opened
 * on the same page.
 *   const data = useNotifRecord("complaint_id", ComplaintService.getComplaintInfo)
 */
export const useNotifRecord = (param, load) => {
    const { url } = usePage();
    const [data, setData] = useState(null);
    const id = new URLSearchParams(url.split("?")[1] ?? "").get(param);
    useEffect(() => {
        let current = true;
        setData(null);
        load(id, (value) => current && setData(value));
        return () => { current = false };
    }, [id]);
    return data;
};

export default NotifDetailCard;
