import { Link } from "@inertiajs/react"
import {
    Avatar,
    Box,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Skeleton,
    Tooltip,
} from "@mui/material"
import {
    BarChart3,
    Bell,
    BellOff,
    CalendarDays,
    CalendarX,
    DoorOpen,
    Phone,
    Share2,
    Trash2,
    TriangleAlert,
    Wrench,
} from "lucide-react"
import { motion } from "framer-motion"
import { parseNotifContent, readableDate, readableTime, toTitleCase } from "@/others/function"
import { SelectCheckbox } from "@/Components/input/select-checkbox"

// Each kind of notification: its icon, colours (soft background, icon) and
// the page it opens.
const KINDS = {
    complaint: { icon: TriangleAlert, bg: "#fee2e2", fg: "#dc2626", link: (o) => `/notifications?id=${o.encrypted_id}&complaint_id=${o.record_key}` },
    referral: { icon: Share2, bg: "#ede9fe", fg: "#7c3aed", link: (o) => `/notifications?id=${o.encrypted_id}&referral_id=${o.record_key}` },
    absent: { icon: CalendarX, bg: "#fef3c7", fg: "#d97706", link: (o) => `/notifications?absent_id=${o.record_key}&id=${o.encrypted_id}` },
    appointment: { icon: CalendarDays, bg: "#dcfce7", fg: "#16a34a" },
    gatepass: { icon: DoorOpen, bg: "#ccfbf1", fg: "#0d9488", link: (o) => `/notifications?gatepass_id=${o.record_key}&id=${o.encrypted_id}` },
    call_in: { icon: Phone, bg: "#dbeafe", fg: "#2563eb" },
    maintenance_notice: { icon: Wrench, bg: "#ffedd5", fg: "#ea580c" },
    semester_summary: { icon: BarChart3, bg: "#e0e7ff", fg: "#4f46e5" },
}
const DEFAULT_KIND = { icon: Bell, bg: "#dbeafe", fg: "#2563eb" }

// The one-line preview: plain text (a message may hold HTML).
const plain = (html) => {
    const div = document.createElement("div")
    div.innerHTML = html ?? ""
    return (div.textContent || "").replace(/\s+/g, " ").trim()
}
const messageOf = (obj) => {
    const content = parseNotifContent(obj.content)
    if (obj.notif_type === "maintenance_notice") return "A new maintenance notice has been posted. Tap to view."
    if (obj.notif_type === "call_in") {
        return content.is_program_head
            ? "Your Student Has Been Called In By The Office of the Prefect"
            : "You Have Been Called in By the Prefect"
    }
    return toTitleCase(plain(content.receiver_notif_message))
}

// "Today" / "Yesterday" / "2 Days Ago" ... / the date.
const groupOf = (timestamp) => {
    const created = new Date(timestamp)
    const today = new Date()
    created.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const days = Math.floor((today - created) / 86400000)
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days <= 3) return `${days} Days Ago`
    return created.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const NotificationList = ({
    list = null,
    overflow = true,
    enableDel = false,
    handlePaginate,
    select = false,
    deleteNotif = () => {},
    size = 0,
}) => {
    const box = overflow ? { maxHeight: "23rem", overflowY: "auto" } : {}

    if (list == null) {
        return (
            <Box sx={box}>
                {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1.5, px: 2, py: 1.5 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton width="85%" height={20} />
                            <Skeleton width="30%" height={16} />
                        </Box>
                    </Box>
                ))}
            </Box>
        )
    }

    if (list.length === 0) {
        return (
            <motion.div
                className="w-full flex flex-col items-center justify-center py-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <div className="mb-3 w-14 h-14 rounded-full bg-gray-100 grid place-items-center text-gray-400">
                    <BellOff size={26} />
                </div>
                <h1 className="text-[1em] text-gray-600 font-semibold">No Notifications Yet</h1>
                <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
            </motion.div>
        )
    }

    // Newest first, under a heading per day.
    const groups = []
    ;[...list]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .forEach((n) => {
            const label = groupOf(n.created_at)
            if (groups.at(-1)?.label !== label) groups.push({ label, items: [] })
            groups.at(-1).items.push(n)
        })

    return (
        <Box sx={box}>
            <List disablePadding>
                {groups.map((g) => (
                    <li key={g.label}>
                        <List disablePadding>
                            <ListSubheader
                                sx={{
                                    lineHeight: "2.25rem",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.04em",
                                    textTransform: "uppercase",
                                    color: "text.secondary",
                                    bgcolor: "var(--dm-surface, #fff)",
                                }}
                            >
                                {g.label}
                            </ListSubheader>
                            {g.items.map((n) => (
                                <NotifItem key={n.encrypted_id ?? n.id} obj={n} enableDel={enableDel} select={select} deleteNotif={deleteNotif} />
                            ))}
                        </List>
                    </li>
                ))}
            </List>
            {list.length > 3 && list.length < size && (
                <Box sx={{ p: 1.5 }}>
                    <Button fullWidth variant="outlined" color="inherit" onClick={handlePaginate}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "0.6rem", color: "text.secondary", borderColor: "divider" }}>
                        See previous notifications
                    </Button>
                </Box>
            )}
        </Box>
    )
}

const NotifItem = ({ obj, enableDel, select, deleteNotif }) => {
    const kind = KINDS[obj.notif_type] ?? DEFAULT_KIND
    const Icon = kind.icon
    const unread = obj.read_since == null
    const link = kind.link?.(obj) ?? `/notifications?id=${obj.encrypted_id}`

    const action = select ? (
        <SelectCheckbox value={obj.encrypted_id} label="Select notification" onClick={(e) => e.stopPropagation()} />
    ) : enableDel ? (
        <Tooltip title="Delete">
            <IconButton
                className="notif-del"
                size="small"
                aria-label="Delete notification"
                onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    deleteNotif(obj.encrypted_id)
                }}
                sx={{ color: "text.secondary", "&:hover": { color: "error.main", bgcolor: "rgba(239,68,68,0.08)" } }}
            >
                <Trash2 size={16} />
            </IconButton>
        </Tooltip>
    ) : null

    return (
        <ListItem
            disablePadding
            secondaryAction={action}
            sx={{
                // Delete shows on hover; always on phones and touch screens.
                "& .notif-del": { opacity: 0, transition: "opacity .15s" },
                "&:hover .notif-del, & .notif-del:focus-visible": { opacity: 1 },
                "@media (hover: none), (max-width: 639.98px)": { "& .notif-del": { opacity: 1 } },
            }}
        >
            <ListItemButton
                component={Link}
                href={link}
                sx={{
                    py: 1.25,
                    pr: action ? 7 : 2,
                    borderRadius: "0.6rem",
                    mx: 0.5,
                    bgcolor: unread ? "rgba(59,130,246,0.06)" : "transparent",
                    "&:hover": { bgcolor: unread ? "rgba(59,130,246,0.1)" : "action.hover" },
                }}
            >
                <ListItemAvatar sx={{ minWidth: 52 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: kind.bg, color: kind.fg }}>
                        <Icon size={19} />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    primary={messageOf(obj)}
                    secondary={`${readableDate(obj.created_at)} • ${readableTime(obj.created_at)}`}
                    slotProps={{
                        primary: {
                            sx: {
                                fontSize: "0.85rem",
                                fontWeight: unread ? 600 : 400,
                                color: unread ? "text.primary" : "text.secondary",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            },
                        },
                        secondary: { sx: { fontSize: "0.72rem", mt: 0.25, color: unread ? "primary.main" : "text.disabled" } },
                    }}
                />
                {unread && <Box aria-label="Unread" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0, ml: 1 }} />}
            </ListItemButton>
        </ListItem>
    )
}

export default NotificationList
