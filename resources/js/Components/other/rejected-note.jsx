import { Box, Typography } from "@mui/material"

/**
 * In an Edit & Resubmit form: why it was rejected (the prefect's reason)
 * and what to do, so the changes can address it.
 */
const RejectedNote = ({ reason, text }) => (
    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "var(--tone-red-bg)", border: 1, borderColor: "var(--tone-red-bd)" }}>
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--tone-red-fg)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Rejected by the Prefect
        </Typography>
        <Typography sx={{ fontSize: "0.875rem", color: "text.primary", mt: 0.25, whiteSpace: "pre-line" }}>
            {reason || "No reason was given."}
        </Typography>
        {text && <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 1 }}>{text}</Typography>}
    </Box>
)

export default RejectedNote
