import { Box } from "@mui/material"
import { FolderOpen } from "lucide-react"

const EmptyTableOverlay = ({ title = "No records found", subtitle = "Try changing the filter or check back later" }) => (
    <Box
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            fontSize: "0.9em",
            color: "var(--dm-text-muted, #555)",
            flexDirection: "column",
            py: 2,
            textAlign: "center",
        }}
    >
        <div style={{ fontSize: "3em", lineHeight: 1 }}>
            <FolderOpen size="1em" />
        </div>
        <div>{title}</div>
        {subtitle && <div style={{ fontSize: "0.8em", marginTop: 4 }}>{subtitle}</div>}
    </Box>
)

export default EmptyTableOverlay
