import { getProfilePic, profileUrl } from "@/others/function"
import { Link, router } from "@inertiajs/react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Avatar, Badge, Box, Chip, Divider, List, ListItemButton, ListItemIcon,
    ListItemText, Paper, Switch, Typography,
} from "@mui/material"
import { User, Settings, LogOut, ChevronRight, History } from "lucide-react"

const roleLabel = (identity) => {
    switch (identity?.role) {
        case "super_admin": return "IT Admin"
        case "sub_admin": return "Prefect"
        case "student": return "Student"
        case "program_head": return "Program Head"
        case "faculty": return "Faculty"
        case "non_teaching_staff": return identity.non_teaching_staff?.position || "Staff"
        case "parent": return "Parent"
        default: return null
    }
}

// One row of the menu: a round icon, the label, and whatever sits on the
// right (chevron, switch or count).
const rowSx = { borderRadius: 2, px: 1.5, py: 1, gap: 1.5 }
const iconSx = (tone = "default") => ({
    minWidth: 0,
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    bgcolor: tone === "error"
        ? (t) => (t.palette.mode === "dark" ? "rgba(239,68,68,0.15)" : "#fef2f2")
        : "action.hover",
    color: tone === "error" ? "error.main" : "text.secondary",
})
const labelProps = { primaryTypographyProps: { fontSize: "0.85rem", fontWeight: 500 } }

const MenuLink = ({ href, icon: Icon, children }) => (
    <ListItemButton component={Link} href={href} sx={rowSx}>
        <ListItemIcon sx={iconSx()}><Icon size={16} /></ListItemIcon>
        <ListItemText primary={children} {...labelProps} />
        <Box component={ChevronRight} size={15} sx={{ color: "text.disabled" }} />
    </ListItemButton>
)

// Header actions (call in, full screen, dark mode) are listed in this menu
// instead of as header buttons. `hideBelow` ("md") hides a row on smaller screens.
const MenuAction = ({ icon: Icon, label, onClick, badge, toggled, hideBelow }) => (
    <ListItemButton
        onClick={onClick}
        sx={{ ...rowSx, ...(hideBelow && { display: { xs: "none", [hideBelow]: "flex" } }) }}
    >
        <ListItemIcon sx={iconSx()}><Icon size={16} /></ListItemIcon>
        <ListItemText primary={label} {...labelProps} />
        {/* The whole row is the click target; the switch just shows the state. */}
        {toggled !== undefined && (
            <Switch size="small" checked={toggled} tabIndex={-1} inputProps={{ "aria-hidden": true }} sx={{ pointerEvents: "none", my: -1 }} />
        )}
        {badge != null && badge > 0 && (
            <Badge badgeContent={badge} max={99} color="success" sx={{ mr: 1.5 }} />
        )}
    </ListItemButton>
)

const AccountModal = (props) => {
    const user = props.user,
          identity = props.identity ?? user
    const fullName = `${identity.profile?.first_name ?? ''} ${identity.profile?.last_name ?? ''}`.trim() || user.username
    const role = roleLabel(identity)

    return (
        <AnimatePresence>
        {props.click &&
        <motion.div
            ref={props.refs}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 right-0 mt-[2.8rem] w-full sm:w-[18rem] z-30"
        >
            <Paper elevation={8} sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        px: 2,
                        py: 2,
                    }}
                >
                    <Avatar
                        src={getProfilePic(identity.profile?.profile_picture, identity.profile?.sex)}
                        alt={fullName}
                        sx={{ width: 52, height: 52, border: 2, borderColor: "background.paper" }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 700 }}>{fullName}</Typography>
                        {role && (
                            <Chip label={role} size="small" color="primary" variant="outlined"
                                sx={{ mt: 0.5, height: 20, fontSize: "0.7rem", fontWeight: 600 }} />
                        )}
                    </Box>
                </Box>

                <Divider />

                <List dense disablePadding sx={{ p: 1 }}>
                    <MenuLink href={`${profileUrl(user)}`} icon={User}>See Profile</MenuLink>
                    <MenuLink href={'/settings/' + user.username} icon={Settings}>Account Settings</MenuLink>
                    <MenuLink href="/my-activity" icon={History}>My Activity</MenuLink>
                </List>

                {props.actions?.length > 0 && (
                    <>
                        <Divider />
                        <List dense disablePadding sx={{ p: 1 }}>
                            {props.actions.map((a) => <MenuAction key={a.key ?? a.label} {...a} />)}
                        </List>
                    </>
                )}

                <Divider />

                <List dense disablePadding sx={{ p: 1 }}>
                    <ListItemButton
                        sx={{ ...rowSx, color: "error.main", "&:hover": { bgcolor: (t) => t.palette.mode === "dark" ? "rgba(239,68,68,0.1)" : "#fef2f2" } }}
                        onClick={() => {
                            localStorage.removeItem('is-unresolved-complaint-modal-clicked');
                            router.visit('/log-out');
                        }}
                    >
                        <ListItemIcon sx={iconSx("error")}><LogOut size={16} /></ListItemIcon>
                        <ListItemText primary="Log Out" {...labelProps} />
                    </ListItemButton>
                </List>
            </Paper>
        </motion.div>
        }
        </AnimatePresence>
    )
}
export default AccountModal
