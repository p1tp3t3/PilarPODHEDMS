import { useContext, useEffect, useState } from "react"
import AuthContext from "@/context-provider/auth-provider"
import { TransactionService } from "@/others/services/transaction-service"
import ListSkeleton from "../reload/list-skeleton"
import { FileText } from "lucide-react"
import { Box, List, Paper, Typography } from "@mui/material"
import { MuiRow } from "./mui-list-parts"

// Today's transactions: each request type the user can make, how many are
// accepted today and how many were requested.
const AvailabilityList = () => {

    const { usr } = useContext(AuthContext)

    const [limit, setLimit] = useState(null)

    useEffect(() => {
        TransactionService.getLimit(setLimit)
    }, [])

    const checkUserType = () => {
        const gatepass = { val: 'gatepass', label: 'Gate Pass', limit: limit.gatepass.limit, requested: limit.gatepass.requested }
        const complaint = { val: 'complaint', label: 'Complaint', limit: limit.complaint.limit, requested: limit.complaint.requested }
        switch(usr.user_type) {
            case 'prefect':
                return [complaint, { val: 'absent-form', label: 'Absent Form' }, { val: 'referral', label: 'Referral' }, gatepass]
            case 'administrative':
                return [complaint, { val: 'referral', label: 'Referral', limit: limit.referral }, gatepass]
            case 'parent':
                return [complaint]
            case 'itrc':
            case 'student':
            case 'faculty':
            case 'staff':
                return [complaint, gatepass]
            default:
                return []
        }
    }

    return (
        <Paper variant="outlined" sx={{ borderRadius: 2, flexShrink: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Today's Transactions</Typography>
            </Box>
            <Box sx={{ height: "21rem", overflowY: "auto", px: 1, py: 0.5 }}>
                {limit != null ? (
                    <List disablePadding>
                        {checkUserType().map((e) => (
                            <Row key={e.val} type={e.label} route={e.val} limit={e.limit} requested={e.requested} />
                        ))}
                    </List>
                ) : (
                    <ListSkeleton rows={3} />
                )}
            </Box>
        </Paper>
    )
}

const Row = ({ type, route, limit, requested }) => {
    const label = (type == 'Complaint' || type == 'Referral') ? `${type} Report` : `${type} Request`
    const full = !(requested <= Number(limit))

    return (
        <MuiRow
            href={`/${route}`}
            icon={FileText}
            iconBg={full ? "var(--tone-gray-bg)" : "var(--tone-green-bg)"}
            iconFg={full ? "var(--tone-gray-fg)" : "#16a34a"}
            primary={label}
            secondary={full ? `${label} is Already Full` : `Accepting ${limit} Users · Requested: ${requested}`}
        />
    )
}
export default AvailabilityList
