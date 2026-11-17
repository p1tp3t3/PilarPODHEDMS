import ProfilePic from "../other/profile-pic"
import ListSkeleton from "../reload/list-skeleton"
import { getProfilePic, showUserType } from "@/others/function"
import { Search } from "lucide-react"
import { List, Paper } from "@mui/material"
import { MuiListEmpty, MuiRow } from "./mui-list-parts"

// The dropdown under a user search: matching people (or "not found").
const UserProfileList = (props) => {
    return (
        <Paper elevation={6} sx={{ width: "100%", borderRadius: 2, p: 0.5, maxHeight: "min(20rem, 45vh)", overflowY: "auto" }}>
            {props.list == null ? (
                <ListSkeleton rows={3} />
            ) : props.list.length === 0 ? (
                <MuiListEmpty icon={Search} title={props.default ? props.default : "User Not Found"} sx={{ py: 2 }} />
            ) : (
                <List disablePadding dense>
                    {props.list.map((e, i) => (
                        <MuiRow
                            key={e.id ?? i}
                            divider={false}
                            avatar={<ProfilePic activeBorderColor='border-white border-[3px]' src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)} size={2} />}
                            primary={`${e.profile?.first_name || ""} ${e.profile?.last_name || ""}`}
                            secondary={showUserType(e)}
                            {...(props.withLink
                                ? { href: props.param ? `${props.link}?search=${e.id_number}` : `/profile/id/${e.id}` }
                                : { onClick: () => props.event(e[props.type], e) })}
                        />
                    ))}
                </List>
            )}
        </Paper>
    )
}
export default UserProfileList
