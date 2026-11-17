import { toTitleCase } from "@/others/function";
import ListSkeleton from "../reload/list-skeleton";
import { TriangleAlert, Skull, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { Avatar, Box, Chip, LinearProgress, List, ListItem, Typography } from "@mui/material";
import { MuiListEmpty } from "./mui-list-parts";

// Risk level of a predicted probability (percent): label, colour, icon.
const riskOf = (r) => {
    if (r >= 85) return { level: "Critical Risk", color: "#7f1d1d", icon: Skull };
    if (r >= 70) return { level: "Very High Risk", color: "#dc2626", icon: User };
    if (r >= 55) return { level: "High Risk", color: "#ea580c", icon: TriangleAlert };
    if (r >= 40) return { level: "Moderate Risk", color: "#eab308", icon: AlertCircle };
    return { level: "Low Risk", color: "#16a34a", icon: CheckCircle2 };
};

// The violations a student may commit, most likely first, each with its
// probability as an MUI progress bar.
const PossibleIncidentList = ({ list = null }) => (
    <Box sx={{ width: "100%", height: "23rem", overflowY: "auto" }}>
        {list == null ? (
            <ListSkeleton rows={4} />
        ) : list.length === 0 ? (
            <MuiListEmpty icon={TriangleAlert} title="No Possible Incident Found" sx={{ height: "100%" }} />
        ) : (
            <List disablePadding>
                {list.map((e, i) => <RiskRow key={i} data={e} i={i + 1} />)}
            </List>
        )}
    </Box>
);

const RiskRow = ({ data, i }) => {
    const percentage = Math.round(data.probability * 100);
    const risk = riskOf(percentage);
    const Icon = risk.icon;

    return (
        <ListItem divider sx={{ px: 1.5, py: 1.25, gap: 1.5, alignItems: "center", "&:last-of-type": { borderBottom: "none" } }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: `${risk.color}1f`, color: risk.color }}>
                <Icon size={17} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }} noWrap>{i}. {toTitleCase(data.violation)}</Typography>
                    <Chip size="small" label={risk.level} sx={{ height: 20, fontSize: "0.66rem", fontWeight: 700, bgcolor: `${risk.color}1f`, color: risk.color }} />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { bgcolor: risk.color, borderRadius: 4 } }}
                    />
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, minWidth: "2.5rem", textAlign: "right" }}>{percentage}%</Typography>
                </Box>
            </Box>
        </ListItem>
    );
};

export default PossibleIncidentList;
