import { TransactionService } from "@/others/services/transaction-service"
import { useEffect, useState } from "react"
import ListSkeleton from "../reload/list-skeleton"
import { FileText } from "lucide-react"
import { Box, Chip, List, Paper, Typography } from "@mui/material"
import { MuiRow } from "./mui-list-parts"

// Today's request statuses (complaint, gate pass ...) for the user's role.
const PendingRequestList = ({ type }) => {
    const [status, setStatus] = useState(null)

    useEffect(() => {
        TransactionService.getStatus(setStatus)
    }, [])

    const rows = () => {
        const defaults = [
            { label: "Complaint Report", status: status.complaint },
            { label: "Gate Pass Request", status: status.gatepass },
        ]
        switch (type) {
            case 'administrative':
                return [...defaults, { label: "Referral Request" }]
            case 'parent':
                return [{ label: "Complaint Requests" }]
            default:
                return defaults
        }
    }

    return (
        <Paper variant="outlined" sx={{ width: "100%", height: "100%", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Request Status This Day</Typography>
            </Box>
            <Box sx={{ px: 1, py: 0.5 }}>
                {status != null ? (
                    <List disablePadding>
                        {rows().map((r) => <Row key={r.label} label={r.label} status={r.status} />)}
                    </List>
                ) : (
                    <ListSkeleton rows={3} />
                )}
            </Box>
        </Paper>
    )
}

const Row = ({ label, status = 'none' }) => {
    const isComplaint = label.toLowerCase().includes('complaint')
    const chip = status === 'pending'
        ? { label: "Pending", color: "warning" }
        : status === (isComplaint ? 'ongoing' : 'approve')
            ? { label: isComplaint ? "Ongoing" : "Approved", color: "success" }
            : { label: "None", color: "default" }

    return (
        <MuiRow
            icon={FileText}
            iconBg="#dcfce7"
            iconFg="#16a34a"
            primary={label}
            right={<Chip size="small" color={chip.color} label={chip.label} sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }} />}
        />
    )
}
export default PendingRequestList
