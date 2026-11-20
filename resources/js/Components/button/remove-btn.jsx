import { IconButton } from "@mui/material"
import { X } from "lucide-react"

/**
 * The ✕ that removes a chosen person (or item) from a form: the same plain
 * grey ✕ as a window's close button (UpModal), not a filled circle.
 */
const RemoveBtn = ({ onClick, label = "Remove", sx }) => (
    <IconButton
        type="button"
        size="small"
        aria-label={label}
        title={label}
        onClick={onClick}
        sx={{ color: "text.secondary", flexShrink: 0, ...sx }}
    >
        <X size={18} />
    </IconButton>
)

export default RemoveBtn
