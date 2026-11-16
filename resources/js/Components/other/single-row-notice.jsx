import { setListQuery, useListQuery } from "@/others/hooks/use-list-data"
import { Button } from "@mui/material"
import { Filter } from "lucide-react"

// Shown on a list page opened with ?id=<encrypted id> (the dashboard's
// "Up next" panel): the list holds only that one row. "Show all" drops the
// id (keeping the other filters) and the list is fetched again from its API.
const SingleRowNotice = ({ noun = "item" }) => {
    const params = useListQuery()
    if (!params.has("id")) return null

    const showAll = () => {
        params.delete("id")
        setListQuery(params)
    }

    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-[0.85em] text-blue-800">
            <span className="flex items-center gap-2">
                <Filter size={15} /> Showing one {noun} only.
            </span>
            <Button size="small" onClick={showAll} sx={{ textTransform: "none", fontWeight: 600 }}>
                Show all
            </Button>
        </div>
    )
}

export default SingleRowNotice
