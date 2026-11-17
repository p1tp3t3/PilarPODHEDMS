import { Link } from "@inertiajs/react"
import { Avatar, Box, ListItem, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material"

/**
 * One row of an MUI list (List > MuiRow ...), shared by the app's non-table
 * lists so they all look alike: an avatar (a photo `src`, an `icon` on a soft
 * colour, or any `avatar` node), a bold `primary` line, a `secondary` line,
 * an optional `footer` under them (chips ...) and a `right` column.
 * `href` makes the row a link, `onClick` a button; otherwise it's static.
 */
export const MuiRow = ({
    href,
    onClick,
    title,
    avatar,
    src,
    icon: Icon,
    iconBg = "var(--tone-blue-bg)",
    iconFg = "#2563eb",
    primary,
    secondary,
    footer,
    right,
    divider = true,
    wrap = false,
    sx,
}) => {
    const av = avatar
        ?? (src != null ? <Avatar src={src} sx={{ width: 38, height: 38 }} />
        : Icon ? <Avatar sx={{ width: 38, height: 38, bgcolor: iconBg, color: iconFg }}><Icon size={18} /></Avatar>
        : null)

    const content = (
        <>
            {av && <ListItemAvatar sx={{ minWidth: 50, alignSelf: footer ? "flex-start" : "center", mt: footer ? 0.5 : 0 }}>{av}</ListItemAvatar>}
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <ListItemText
                    sx={{ my: 0 }}
                    primary={primary}
                    secondary={secondary}
                    slotProps={{
                        primary: {
                            sx: {
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                color: "text.primary",
                                ...(wrap ? {} : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
                            },
                        },
                        secondary: {
                            component: "div",
                            sx: {
                                fontSize: "0.72rem",
                                color: "text.secondary",
                                ...(wrap ? {} : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
                            },
                        },
                    }}
                />
                {footer}
            </Box>
            {right && (
                <Box sx={{ flexShrink: 0, ml: 1.5, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, textAlign: "right", fontSize: "0.72rem", color: "text.secondary" }}>
                    {right}
                </Box>
            )}
        </>
    )

    const pad = { py: 1, px: 1.5 }
    return (
        <ListItem disablePadding divider={divider} sx={{ "&:last-of-type": { borderBottom: "none" }, ...sx }}>
            {href || onClick ? (
                <ListItemButton component={href ? Link : "div"} href={href} onClick={onClick} title={title} sx={{ ...pad, borderRadius: 1 }}>
                    {content}
                </ListItemButton>
            ) : (
                <Box sx={{ display: "flex", alignItems: "center", width: "100%", ...pad }}>{content}</Box>
            )}
        </ListItem>
    )
}

/** A list's empty state: an icon in a soft circle and a message. */
export const MuiListEmpty = ({ icon: Icon, title, subtitle, sx }) => (
    <Box sx={{ py: 5, px: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "text.secondary", ...sx }}>
        {Icon && (
            <Avatar sx={{ width: 52, height: 52, bgcolor: "action.hover", color: "text.disabled", mb: 1.5 }}>
                <Icon size={24} />
            </Avatar>
        )}
        <Box sx={{ fontSize: "0.9rem", fontWeight: 600 }}>{title}</Box>
        {subtitle && <Box sx={{ fontSize: "0.8rem", color: "text.disabled", mt: 0.5 }}>{subtitle}</Box>}
    </Box>
)
