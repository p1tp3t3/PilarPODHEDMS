import ListSkeleton from "../reload/list-skeleton"
import { Search } from "lucide-react"
import { List, Paper } from "@mui/material"
import { MuiListEmpty, MuiRow } from "./mui-list-parts"

// The dropdown under a search: matching labels (or "not found").
const LabelList = (props) => {
    const items = (props.list ?? []).map((item) => ({ id: item.id, label: item[props.label] }))

    return (
        <Paper elevation={6} sx={{ width: "100%", borderRadius: 2, p: 0.5, maxHeight: "min(20rem, 45vh)", overflowY: "auto" }}>
            {props.list == null ? (
                <ListSkeleton rows={3} avatar={false} />
            ) : items.length === 0 ? (
                <MuiListEmpty icon={Search} title={props.default ? props.default : "User Not Found"} sx={{ py: 2 }} />
            ) : (
                <List disablePadding dense>
                    {items.map((e, i) => (
                        <MuiRow
                            key={e.id ?? i}
                            divider={false}
                            primary={props.withLink && props.link?.includes('family') ? `${e.label} Family` : e.label}
                            {...(props.withLink
                                ? { href: `${props.link}?search=${e.id}` }
                                : { onClick: () => props.event(e.id, e.label) })}
                        />
                    ))}
                </List>
            )}
        </Paper>
    )
}
export default LabelList
