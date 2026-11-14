import { router } from "@inertiajs/react"
import { Button } from "@mui/material"
import { Filter } from "lucide-react"

// Shown on a list page opened with ?id=<encrypted id> (the dashboard's
// "Up next" panel): the list holds only that one row. "Show all" reloads the
// page without the id, keeping the other filters.
const SingleRowNotice = ({ noun = "item" }) => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has("id")) return null

    const showAll = () => {
        params.delete("id")
        const q = params.toString()
        router.visit(`${window.location.pathname}${q ? `?${q}` : ""}`)
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
