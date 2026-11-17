import { showUserType } from "../../others/function"
import ProfilePic from "./profile-pic"
import { X } from "lucide-react"
import { Box, IconButton, Typography } from "@mui/material"

// A chosen user (in a form, a detail view ...): photo, name, role line; with
// `unselect`, a small ✕ to remove them.
const SelectedUser = (props) => {
    const showActive = (props.showActive) ? { showActive: true, isActive: props.activeStatus } : {}
    return (
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.25 }}>
            {(props.unselect != null) && (
                <IconButton
                    size="small"
                    aria-label="Remove"
                    onClick={() => props.unselect(null)}
                    sx={{ position: "absolute", top: -6, left: -6, zIndex: 5, width: 20, height: 20, bgcolor: "action.selected", color: "text.primary", "&:hover": { bgcolor: "action.focus" } }}
                >
                    <X size={12} />
                </IconButton>
            )}
            <ProfilePic src={props.src} size={2.5} {...showActive} />
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3 }}>{`${props.name[0]} ${props.name[1]}`}</Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{showUserType(props.user, true)}</Typography>
            </Box>
        </Box>
    )
}
export default SelectedUser
