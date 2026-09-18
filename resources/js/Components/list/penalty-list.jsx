import { useEffect, useMemo, useState } from "react"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import ListSkeleton from "../reload/list-skeleton"
import { toTitleCase } from "@/others/function"
import { ViolationService } from "@/others/services/violation-service";

const PenaltyList = ({ list = null }) => {
    const [penaltyList, setPenaltyList] = useState(list);

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

    return (
        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", backgroundColor: "#fff", borderRadius: 2, boxShadow: 1, p: 2 }}>
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

export default PenaltyList;
