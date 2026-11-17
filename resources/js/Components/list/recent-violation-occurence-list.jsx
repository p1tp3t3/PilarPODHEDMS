import { useEffect, useState } from "react";
import ListSkeleton from "../reload/list-skeleton";
import { ViolationService } from "@/others/services/violation-service";
import { ordinal, readableDate, readableTime } from "@/others/function";
import { TriangleAlert } from "lucide-react";
import { Box, Card, CardContent, Chip, Stack, Step, StepContent, StepLabel, Stepper, Typography } from "@mui/material";
import { MuiListEmpty } from "./mui-list-parts";

const RecentViolationOccurenceList = ({ user_id, list: listProp = null }) => {
    const [list, setList] = useState(listProp);

    useEffect(() => {
        // The profile controller now passes the occurrence list down as a
        // prop; only fall back to the API call when none is given.
        if (listProp != null) {
            setList(listProp);
            return;
        }

        ViolationService.getViolationOccurrenceList(user_id, setList);
    }, [user_id, listProp]);

    if (list === null) return <ListSkeleton rows={3} variant="card" />;

    if (list.length === 0) {
        return (
            <MuiListEmpty
                icon={TriangleAlert}
                title="No Violations Found"
                subtitle="There are no recorded violations for this student."
                sx={{ minHeight: "20rem" }}
            />
        );
    }

    return (
        <Stack spacing={1.5} sx={{ width: "100%" }}>
            {list.map((e, i) => <Row key={i} data={e} />)}
        </Stack>
    );
};

// One violation's offenses as an MUI vertical stepper: a numbered step per
// offense, newest at the bottom (the active one).
const Row = ({ data }) => {
    const violation = data.offense?.violation;
    const occurrences = data.occurrence_list ?? [];

    const name = violation?.violation_name ?? "Unknown Violation";
    const count = data.total_occurrence;

    return (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>{name}</Typography>
                    <Chip size="small" color="primary" variant="outlined" label={`${count} offense${count === 1 ? "" : "s"}`} sx={{ fontWeight: 600 }} />
                </Box>

                <Stepper orientation="vertical" activeStep={occurrences.length - 1} nonLinear
                    sx={{ "& .MuiStepConnector-line": { minHeight: 12 } }}>
                    {occurrences.map((o, i) => {
                        const last = i === occurrences.length - 1;
                        return (
                            <Step key={o.occurrence} expanded completed={!last} active={last}>
                                <StepLabel
                                    icon={o.occurrence}
                                    optional={
                                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                                            {o.date ? `${readableDate(o.date)} (${readableTime(o.date)})` : "N/A"}
                                        </Typography>
                                    }
                                    sx={{ "& .MuiStepLabel-label": { fontWeight: 600, fontSize: "0.88rem" } }}
                                >
                                    {ordinal(o.occurrence)} Offense
                                    {last && <Chip size="small" color="primary" label="Latest" sx={{ ml: 1, height: 18, fontSize: "0.65rem" }} />}
                                </StepLabel>
                                <StepContent>
                                    {o.penalty ? (
                                        <Typography sx={{ fontSize: "0.83rem", color: "text.secondary" }}>
                                            <Box component="span" sx={{ color: "text.disabled" }}>Penalty:</Box> {o.penalty.description}
                                            {/* Only when the penalty came from a different (lower) occurrence. */}
                                            {o.penalty.occurrence_used !== o.occurrence && (
                                                <Box component="span" sx={{ color: "text.disabled", fontSize: "0.9em" }}> (uses the {ordinal(o.penalty.occurrence_used)} occurrence's penalty)</Box>
                                            )}
                                        </Typography>
                                    ) : (
                                        <Typography sx={{ fontSize: "0.83rem", color: "text.disabled", fontStyle: "italic" }}>
                                            No penalty defined for this occurrence.
                                        </Typography>
                                    )}
                                </StepContent>
                            </Step>
                        );
                    })}
                </Stepper>
            </CardContent>
        </Card>
    );
};

export default RecentViolationOccurenceList;
