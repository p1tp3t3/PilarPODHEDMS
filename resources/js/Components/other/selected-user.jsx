import { showUserType } from "../../others/function"
import ProfilePic from "./profile-pic"
import { Box, Typography } from "@mui/material"
import RemoveBtn from "../button/remove-btn"

// A chosen user (in a form, a detail view ...): photo, name, role line; with
// `unselect`, a small ✕ to remove them.
const SelectedUser = (props) => {
    const showActive = (props.showActive) ? { showActive: true, isActive: props.activeStatus } : {}
    return (
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.25 }}>
            <ProfilePic src={props.src} size={2.5} {...showActive} />
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3 }}>{`${props.name[0]} ${props.name[1]}`}</Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{showUserType(props.user, true)}</Typography>
            </Box>
            {/* Remove: the same ✕ as a window's close button. */}
            {(props.unselect != null) && <RemoveBtn onClick={() => props.unselect(null)} sx={{ ml: 0.5 }} />}
        </Box>
    )
}
export default SelectedUser
