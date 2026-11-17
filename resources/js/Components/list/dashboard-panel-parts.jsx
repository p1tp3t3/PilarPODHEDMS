import { AlertCircle } from "lucide-react"
import { Box, List, Typography } from "@mui/material"
import ListSkeleton from "../reload/list-skeleton"
import { getProfilePic } from "@/others/function"
import { MuiListEmpty, MuiRow } from "./mui-list-parts"

// Shared layout for the prefect dashboard's tabbed panel (New Students,
// Scheduled Appointments, Notifications, Watch List): a header, then an MUI
// list that fills the remaining panel height and scrolls inside it.

export const PanelHeader = ({ title, subtitle, children }) => (
    <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 1.5, pb: 1, display: "grid", gap: 1 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: 1.5 }}>
            <Typography component="h2" sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary" }}>{title}</Typography>
            {subtitle && <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{subtitle}</Typography>}
        </Box>
        {children}
    </Box>
)

export const PanelBody = ({ list, empty, children }) => (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 1, sm: 1.5 }, pb: 1 }}>
        {list == null ? (
            <ListSkeleton rows={4} />
        ) : list.length === 0 ? (
            <MuiListEmpty icon={AlertCircle} title={empty} sx={{ minHeight: "10rem", height: "100%" }} />
        ) : (
            <List disablePadding>{children}</List>
        )}
    </Box>
)

// A person in a panel: their photo, name, `sub` line, `footer` and `right`.
export const PersonRow = ({ user, sub, right, footer, href, onClick, title }) => (
    <MuiRow
        href={href}
        onClick={onClick}
        title={title}
        src={getProfilePic(user?.profile?.profile_picture, user?.profile?.sex)}
        primary={`${user?.profile?.first_name ?? ""} ${user?.profile?.last_name ?? ""}`.trim() || user?.username}
        secondary={sub}
        footer={footer}
        right={right}
    />
)

// Case-insensitive match on a user's full name, username or ID number.
export const matchesPerson = (user, query) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const p = user?.profile ?? {}
    return `${p.first_name ?? ""} ${p.middle_name ?? ""} ${p.last_name ?? ""} ${user?.username ?? ""} ${user?.id_number ?? ""}`
        .toLowerCase()
        .includes(q)
}
