import { useEffect, useMemo, useState } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import ListSkeleton from "../reload/list-skeleton"
import { toTitleCase } from "@/others/function"
import { ViolationService } from "@/others/services/violation-service";
import { useIsMobile } from "@/others/use-is-mobile"
import { Search } from "lucide-react"

const PenaltyList = ({ list = null }) => {
    const [penaltyList, setPenaltyList] = useState(list);
    const isMobile = useIsMobile()

    useEffect(() => {
        // Prefect dashboard passes the list down from the controller;
        // fall back to fetching it only when no list prop was given.
        if (list != null) return;

        ViolationService.getPenaltyList(setPenaltyList)
    }, []);

    const rows = useMemo(() => {
        if (!penaltyList) return []
        return penaltyList.map((e, i) => ({
            id: e.id ?? i,
            i: i + 1,
            ref_number: e.ref_number,
            description: toTitleCase(e.description),
        }))
    }, [penaltyList])

    const columns = useMemo(() => [
        { field: "i", headerName: "#", width: 60 },
        { field: "ref_number", headerName: "Ref No.", width: 140 },
        { field: "description", headerName: "Penalty Name", flex: 1, minWidth: 200 },
    ], [])

    if (penaltyList === null) {
        return (
            <div className="w-full px-5 py-10 bg-white rounded-md shadow-black/20 shadow-sm flex justify-center">
                <ListSkeleton rows={3} />
            </div>
        )
    }

    if (isMobile) return <MobilePenaltyList rows={rows} />

    return (
        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", backgroundColor: "var(--dm-surface, #fff)", borderRadius: 2, boxShadow: 1, p: 2 }}>
            <DataGrid
                rows={rows}
                columns={columns}
                hideFooter
                disableRowSelectionOnClick
                showToolbar
                localeText={{ noRowsLabel: "No Penalty Yet" }}
            />
        </Box>
    );
};

// Phones: one compact list instead of a card per penalty — the ref number as
// a tag beside the name, grouped by its whole number (1.x, 5.x, ...).
const MobilePenaltyList = ({ rows }) => {
    const [search, setSearch] = useState("")

    const groups = useMemo(() => {
        const q = search.trim().toLowerCase()
        const shown = rows.filter((r) => !q || r.description?.toLowerCase().includes(q) || String(r.ref_number).includes(q))
        const byLevel = new Map()
        shown.forEach((r) => {
            const level = Math.floor(Number(r.ref_number))
            if (!byLevel.has(level)) byLevel.set(level, [])
            byLevel.get(level).push(r)
        })
        return [...byLevel.entries()].sort((a, b) => a[0] - b[0])
    }, [rows, search])

    return (
        <div className="w-full bg-white rounded-lg shadow-sm shadow-black/10 border border-gray-200 p-3 grid gap-3 min-w-0">
            <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search penalty..."
                    className="w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 py-2 text-[0.85em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {groups.length === 0 ? (
                <p className="py-8 text-center text-[0.85em] text-gray-500">
                    {rows.length ? "No penalty matches your search." : "No Penalty Yet"}
                </p>
            ) : (
                groups.map(([level, items]) => (
                    <div key={level} className="grid gap-1">
                        <div className="px-1 text-[0.7em] font-semibold uppercase tracking-wider text-gray-400">
                            Level {level}
                        </div>
                        <ul className="rounded-md border border-gray-100 divide-y divide-gray-100">
                            {items.map((r) => (
                                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                                    <span className="shrink-0 min-w-[2.75rem] text-center rounded-md bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[0.8em] font-semibold tabular-nums">
                                        {Number(r.ref_number).toFixed(1)}
                                    </span>
                                    <span className="min-w-0 text-[0.9em] text-gray-800">{r.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
        </div>
    )
}

export default PenaltyList;
