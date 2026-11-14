import { useMemo } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import Box from "@mui/material/Box";
import ProfilePic from "../other/profile-pic";
import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase } from "@/others/function";

// Gate passes the prefect has approved, for the guard to check at the gate.
// `list` is the users with their latest approved gate pass (user.gatepass[0]);
// null while loading.
const allowedTo = (gp) => {
    try {
        const list = JSON.parse(gp.allow_to ?? "[]");
        return (Array.isArray(list) ? list : [list]).map((a) => toTitleCase(String(a).replace("-", " "))).join(" and ");
    } catch {
        return toTitleCase(String(gp.allow_to ?? ""));
    }
};
const when = (d) => (d ? `${readableDate(d)} (${readableTime(d)})` : "—");

const GatePassApprovedList = ({ list = null }) => {
    const rows = useMemo(() => (list ?? []).map((u, i) => {
        const gp = u.gatepass?.[0] ?? {};
        return {
            id: gp.id ?? `${u.id}-${i}`,
            name: [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(" ") || "—",
            type: showUserType(u),
            picture: u.profile?.profile_picture,
            sex: u.profile?.sex,
            number: gp.gatepass_number ?? "—",
            allowed: allowedTo(gp),
            expires: gp.date_expiration,
        };
    }), [list]);

    const columns = useMemo(() => [
        {
            field: "index", headerName: "#", width: 60, sortable: false, filterable: false,
            renderCell: (p) => `${p.api.getRowIndexRelativeToVisibleRows(p.id) + 1}.`,
        },
        { field: "number", headerName: "Gate Pass No.", minWidth: 140, flex: 0.7 },
        {
            field: "name",
            headerName: "Student",
            flex: 1.4,
            minWidth: 240,
            renderCell: (p) => (
                <div className="flex gap-3 items-center h-full min-w-0">
                    <ProfilePic size={2.5} src={getProfilePic(p.row.picture, p.row.sex)} />
                    <div className="leading-tight min-w-0">
                        <p className="text-[0.9em] font-semibold text-gray-800 truncate">{p.value}</p>
                        <p className="text-[0.8em] text-gray-500 truncate">{p.row.type}</p>
                    </div>
                </div>
            ),
        },
        { field: "allowed", headerName: "Allowed To", minWidth: 170, flex: 0.9, valueFormatter: (v) => v || "—" },
        { field: "expires", headerName: "Expires", minWidth: 190, flex: 1, valueFormatter: (v) => when(v), sortComparator: (a, b) => new Date(a) - new Date(b) },
    ], []);

    return (
        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={list === null}
                rowHeight={64}
                disableRowSelectionOnClick
                showToolbar
                initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                }}
                pageSizeOptions={[10, 20, 50]}
                localeText={{ noRowsLabel: "No approved gate passes right now. Approvals will appear here." }}
                mobileSummary={(r) => ({ name: r.name, role: `Gate Pass #${r.number}`, picture: r.picture, sex: r.sex, hide: ["name"] })}
            />
        </Box>
    );
};

export default GatePassApprovedList;
