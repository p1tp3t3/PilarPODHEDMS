import { readableDate, readableTime, toTitleCase } from "@/others/function";
import ListSkeleton from "../reload/list-skeleton";
import { TriangleAlert } from "lucide-react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { MuiListEmpty } from "./mui-list-parts";

// A student's incidents (or the violations issued for them) as MUI cards.
const IncidentList = ({ list = null, isIncident }) => {
    if (list == null) return <ListSkeleton rows={3} variant="card" />;

    if (list.length === 0) {
        return (
            <MuiListEmpty
                icon={TriangleAlert}
                title={`No ${isIncident ? "Incidents" : "Violations"} Found`}
                subtitle={`There are no recorded ${isIncident ? "incidents" : "violations"} for this student.`}
                sx={{ minHeight: "20rem" }}
            />
        );
    }

    return (
        <Stack spacing={1.5} sx={{ width: "100%" }}>
            {list.map((e, i) => <Row key={i} data={e} isIncident={isIncident} />)}
        </Stack>
    );
};

const Row = ({ data, isIncident }) => {
    const complaint = data.complaint ?? {};
    // ALL violations from the backend
    const offenses = data.offenses ?? [];

    return (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: "grid", gap: 1.5, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip size="small" color="primary" label={`Case No. ${complaint.id ?? data.complaint_id}`} />
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {isIncident
                            ? toTitleCase(complaint.incident)
                            : offenses.length > 0
                                ? `${offenses.length} Violation(s)`
                                : "No Violations Issued"}
                    </Typography>
                </Stack>

                <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                    {readableDate(complaint.created_at)} • {readableTime(complaint.created_at)}
                </Typography>

                {!isIncident && offenses.length > 0 && (
                    <Box sx={{ display: "grid", gap: 1 }}>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.secondary" }}>Violations</Typography>
                        {offenses.map((off, index) => {
                            const v = off.violation;
                            const major = !!v?.offense_status;
                            return (
                                <Box key={index} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "action.hover" }}>
                                    <Typography sx={{ fontSize: "0.85rem" }}>{toTitleCase(v?.violation_name ?? "Unknown Violation")}</Typography>
                                    <Chip size="small" color={major ? "error" : "warning"} label={major ? "Major Offense" : "Minor Offense"} sx={{ fontSize: "0.7rem" }} />
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* Only sent to the prefect. */}
                {!isIncident && data.incident_summary && (
                    <Box sx={{ display: "grid", gap: 1 }}>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.secondary" }}>Prefect&apos;s Remarks</Typography>
                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "action.hover", fontSize: "0.85rem", maxHeight: "8.5rem", overflowY: "auto" }}>
                            {data.incident_summary}
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default IncidentList;
