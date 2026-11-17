import { getProfilePic, getYearLevel, readableDate, readableTime, showUserType, profileUrl } from "@/others/function"
import ListSkeleton from "../reload/list-skeleton"
import { AlertCircle } from "lucide-react"
import { Box, List, Paper, Typography } from "@mui/material"
import useListData from "@/others/hooks/use-list-data"
import { MuiListEmpty, MuiRow } from "./mui-list-parts"

// `list` given (a notification's users): shown as is. Otherwise the
// dashboard's "New Users this week", loaded from /api/dashboard/panel/new-users.
const NewUserList = ({ list: given, showTitle = true, weekStart = null, weekEnd = null }) => {
    const { data } = useListData("/api/dashboard/panel/new-users", {}, { enabled: given === undefined })
    const list = given !== undefined ? given : (data?.list ?? null)
    return (
        <Paper variant="outlined" sx={{ width: "100%", borderRadius: 2, overflow: "hidden" }}>
            {showTitle && (
                <Box sx={{ px: 2.5, py: 1.25, display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: 1.5, borderBottom: 1, borderColor: "divider" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                        {list?.length ?? 0} New User{(list?.length != 1) ? 's' : ''} This Week
                    </Typography>
                    {weekStart && weekEnd && (
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{readableDate(weekStart)} – {readableDate(weekEnd)}</Typography>
                    )}
                </Box>
            )}
            <Box sx={{ px: 1, py: 1, height: "22rem", overflowY: "auto" }}>
                {list == null ? (
                    <ListSkeleton rows={4} />
                ) : list.length === 0 ? (
                    <MuiListEmpty icon={AlertCircle} title="No New Users This Week" sx={{ height: "100%" }} />
                ) : (
                    <List disablePadding>
                        {list.map((e) => <Row obj={e} key={e.id} />)}
                    </List>
                )}
            </Box>
        </Paper>
    )
}

const Row = ({ obj }) => {
    const isStudent = obj.role === "student"
    const latestEnrollment = obj.enrollments?.[obj.enrollments.length - 1]
    const programName = obj.program?.code ?? latestEnrollment?.program?.code
    const detail = isStudent
        ? [programName, latestEnrollment?.year_level ? getYearLevel(latestEnrollment.year_level) : null].filter(Boolean).join(" • ")
        : (["program_head", "faculty"].includes(obj.role) ? showUserType(obj, true) : showUserType(obj))

    return (
        <MuiRow
            href={profileUrl(obj)}
            src={getProfilePic(obj.profile?.profile_picture, obj.profile?.sex)}
            primary={`${obj.profile?.first_name ?? ""} ${obj.profile?.last_name ?? ""}`}
            secondary={detail || "-"}
            right={
                <>
                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{readableDate(obj.created_at)}</Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.disabled" }}>{readableTime(obj.created_at)}</Typography>
                </>
            }
        />
    )
}
export default NewUserList
