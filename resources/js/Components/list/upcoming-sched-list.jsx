import { readableDate, readableTime } from "../../others/function";
import { CalendarX, CalendarClock, Info, History } from "lucide-react";
import { Link } from "@inertiajs/react";
import { useState } from "react";
import { Box, Button, Chip, IconButton, List, Paper, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { MuiListEmpty, MuiRow } from "./mui-list-parts";

// Outcome of a past appointment, from its two status columns.
const outcome = (a) => {
    if (a.appointment_status === "rejected") return { label: "Rejected", color: "error" };
    if (a.appointment_status !== "accepted") return { label: "Not Confirmed", color: "default" };
    if (a.attendance_status === "present") return { label: "Attended", color: "success" };
    if (a.attendance_status === "absent") return { label: "Missed", color: "warning" };
    return { label: "Not Marked", color: "default" };
};

// `previous` (optional): past appointments — when given, the panel gets an
// Upcoming / Previous switch.
const AppointmentScheduleList = ({ list = [], previous, showAction = false, events = () => {} }) => {
    const [view, setView] = useState("upcoming");
    const showingPrevious = previous !== undefined && view === "previous";
    const rows = showingPrevious ? previous : list;

    return (
        <Paper variant="outlined" sx={{ width: "100%", height: "22rem", borderRadius: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <Box sx={{ px: 2.5, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {showingPrevious ? "Previous Appointments" : "Upcoming Appointments"}
                </Typography>
                {previous !== undefined && (
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={view}
                        onChange={(_, v) => v && setView(v)}
                        sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, fontSize: "0.75rem", py: 0.25, px: 1.25 } }}
                    >
                        <ToggleButton value="upcoming">Upcoming</ToggleButton>
                        <ToggleButton value="previous">Previous</ToggleButton>
                    </ToggleButtonGroup>
                )}
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1, py: 0.5 }}>
                {rows.length !== 0 ? (
                    <List disablePadding>
                        {rows.map((e, i) => (
                            showingPrevious
                                ? <PreviousRow key={e.encrypted_id ?? i} data={e} />
                                : <Row key={e.id ?? i} events={events} data={e} showAction={showAction} />
                        ))}
                    </List>
                ) : (
                    <MuiListEmpty icon={CalendarX} title={showingPrevious ? "No Previous Appointments" : "No Appointments Yet"} sx={{ height: "100%" }} />
                )}
            </Box>
        </Paper>
    );
};

const PreviousRow = ({ data }) => {
    const o = outcome(data);
    return (
        <MuiRow
            icon={History}
            iconBg="var(--tone-gray-bg)"
            iconFg="var(--tone-gray-fg)"
            primary={readableDate(data.date_time_appoint)}
            secondary={`${readableTime(data.date_time_appoint)}${data.appointment_number ? ` · No. ${data.appointment_number}` : ""}`}
            right={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Chip size="small" color={o.color} variant={o.color === "default" ? "outlined" : "filled"} label={o.label} sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }} />
                    <Tooltip title="View details">
                        <IconButton component={Link} href={`/appointment?view=${data.encrypted_id}`} size="small" color="primary">
                            <Info size={17} />
                        </IconButton>
                    </Tooltip>
                </Box>
            }
        />
    );
};

const Row = ({ data, showAction, events }) => (
    <MuiRow
        icon={CalendarClock}
        primary={readableDate(data.date_time_appoint)}
        secondary={`Starts at ${readableTime(data.date_time_appoint)}`}
        footer={showAction && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
                <Button size="small" variant="outlined" color="error" onClick={() => events("cancel", data.id, data)}
                    sx={{ textTransform: "none", fontWeight: 600, py: 0.25 }}>
                    Cancel
                </Button>
                <Button size="small" variant="outlined" onClick={() => events("resched", data.id, data)}
                    sx={{ textTransform: "none", fontWeight: 600, py: 0.25 }}>
                    Re-Schedule
                </Button>
            </Box>
        )}
        right={showAction && (
            <Tooltip title="View details">
                <IconButton size="small" color="primary" onClick={() => events("view", data.id)}>
                    <Info size={17} />
                </IconButton>
            </Tooltip>
        )}
    />
);

export default AppointmentScheduleList;
