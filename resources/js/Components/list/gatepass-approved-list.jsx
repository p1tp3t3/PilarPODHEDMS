import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase } from "@/others/function";
import ProfilePic from "../other/profile-pic";
import { Card, CardContent, Chip, Typography, Skeleton, Stack } from "@mui/material";
import { AlertCircle, LogIn, LogOut, CalendarClock } from "lucide-react";

const GatePassApprovedList = ({ list = null }) => {
    return (
        <div className="w-full px-4 sm:px-5 py-4 bg-white">
            <div className="w-full grid gap-3">
                {list !== null ? (
                    list.length !== 0 ? (
                        list.map((e, i) => <Row key={i} data={e} />)
                    ) : (
                        <div className="text-gray-500 w-full grid place-items-center py-14">
                            <div className="grid place-items-center text-center gap-1">
                                <div className="w-14 h-14 rounded-full bg-gray-100 grid place-items-center mb-1">
                                    <AlertCircle size={26} className="text-gray-400" />
                                </div>
                                <div className="font-semibold text-gray-700">No Approved Users Yet</div>
                                <div className="text-sm text-gray-500">Gate pass approvals will appear here.</div>
                            </div>
                        </div>
                    )
                ) : (
                    <Stack spacing={1.5}>
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={92} animation="wave" />
                        ))}
                    </Stack>
                )}
            </div>
        </div>
    );
};

const Row = ({ data }) => {
    const gp = data.gatepass[0];
    const allowTo = JSON.parse(gp.allow_to);
    const isExpired = new Date(gp.date_expiration) <= new Date();

    return (
        <Card variant="outlined" sx={{ borderRadius: "0.75rem", borderColor: "rgb(229 231 235)" }}>
            <CardContent>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    {/* LEFT: Profile + Info */}
                    <div className="flex gap-4 items-center min-w-0">
                        <ProfilePic
                            src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
                            size={3}
                        />

                        <div className="leading-snug min-w-0">
                            <Typography variant="subtitle1" fontWeight={700} noWrap>
                                {data.profile?.first_name} {data.profile?.last_name}
                            </Typography>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                                <Chip size="small" color="primary" variant="outlined" label={showUserType(data)} />
                                <Chip
                                    size="small"
                                    color={isExpired ? "default" : "success"}
                                    label={isExpired ? "Expired" : "Active"}
                                />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                                Gate Pass No. {gp.gatepass_number}
                            </Typography>
                        </div>
                    </div>

                    {/* RIGHT: Gate Pass Info */}
                    <div className="flex md:flex-col gap-3 md:gap-1 md:items-end flex-wrap md:text-right pl-[3.75rem] md:pl-0">
                        <Stack direction="row" spacing={0.5} alignItems="center" color="success.main">
                            <LogIn size={14} />
                            <Typography variant="caption" fontWeight={600}>
                                Approved {readableDate(gp.confirmed_at)} • {readableTime(gp.confirmed_at)}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center" color="info.main">
                            <LogOut size={14} />
                            <Typography variant="caption" fontWeight={600}>
                                Allowed to {allowTo.map((a) => toTitleCase(a.replace('-', ' '))).join(' and ')} the Campus
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center" color={isExpired ? "text.disabled" : "error.main"}>
                            <CalendarClock size={14} />
                            <Typography variant="caption" fontWeight={600}>
                                Expires {readableDate(gp.date_expiration)} {readableTime(gp.date_expiration)}
                            </Typography>
                        </Stack>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default GatePassApprovedList;
