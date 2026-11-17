import { Link } from "@inertiajs/react"
import { Box, Button, List, Paper, Typography } from "@mui/material"
import { ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react"
import useListData from "@/others/hooks/use-list-data"
import ListSkeleton from "../reload/list-skeleton"
import { MuiListEmpty, MuiRow } from "./mui-list-parts"
import { readableDate } from "@/others/function"

const MONITOR = "/super-admin/security-monitor"

// Severity: a small dot and its name (colours as on the Security Monitor).
const SEVERITY = {
    high: { label: "High", color: "#dc2626" },
    medium: { label: "Medium", color: "#f97316" },
    low: { label: "Low", color: "var(--tone-gray-fg)" },
}

const when = (s) => {
    const d = new Date(String(s).replace(" ", "T"))
    return isNaN(d) ? s : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

const Severity = ({ value }) => {
    const sev = SEVERITY[value] ?? SEVERITY.low
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: sev.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{sev.label}</Typography>
        </Box>
    )
}

// The System Admin dashboard's view of the Security Monitor: this week's
// events (newest first) as a list, loaded from /api/dashboard/panel/security.
const SecurityOverviewPanel = () => {
    const { data } = useListData("/api/dashboard/panel/security", {})
    const list = data?.list ?? null

    return (
        <Paper elevation={1} sx={{ borderRadius: "0.5rem", overflow: "hidden", minWidth: 0 }}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.25, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1, borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography component="h2" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {list != null && `${list.length} `}Security Events This Week
                    </Typography>
                    {data?.week_start && (
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                            {readableDate(data.week_start)} – {readableDate(data.week_end)}
                        </Typography>
                    )}
                </Box>
                <Button
                    component={Link}
                    href={MONITOR}
                    size="small"
                    endIcon={<ArrowRight size={15} />}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                >
                    Security Monitor
                </Button>
            </Box>

            <Box sx={{ maxHeight: "24rem", overflowY: "auto", px: { xs: 1, sm: 1.5 }, py: 0.5 }}>
                {list == null ? (
                    <ListSkeleton rows={3} />
                ) : list.length === 0 ? (
                    <MuiListEmpty icon={ShieldCheck} title="No Security Events This Week" sx={{ minHeight: "8rem" }} />
                ) : (
                    <List disablePadding>
                        {list.map((e) => (
                            <MuiRow
                                key={`${e.id}-${e.datetime}`}
                                href={MONITOR}
                                icon={ShieldAlert}
                                iconBg="var(--tone-gray-bg)"
                                iconFg="var(--tone-gray-fg)"
                                primary={e.type_label}
                                secondary={`${e.message}${e.username ? ` · ${e.username}` : ""}`}
                                footer={
                                    <Typography component="div" noWrap sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.25 }}>
                                        {when(e.datetime)} · {e.ip ?? "Unknown IP"}
                                    </Typography>
                                }
                                right={<Severity value={e.severity} />}
                            />
                        ))}
                    </List>
                )}
            </Box>
        </Paper>
    )
}

export default SecurityOverviewPanel
