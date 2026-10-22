// "Filed By (Prefect)" column for the prefect's record tables (complaints,
// referrals, absent forms, gate passes): which prefect filed/issued the
// record on someone's behalf, or "—" when the person filed it themselves.

export const prefectName = (prefect) =>
    prefect
        ? [prefect.profile?.first_name, prefect.profile?.last_name].filter(Boolean).join(" ") || prefect.username
        : null

// getPrefect(row) -> the row's `prefect` user (or null).
export const filedByColumn = (getPrefect) => ({
    field: "filed_by",
    headerName: "Filed By (Prefect)",
    width: 170,
    valueGetter: (value, row) => prefectName(getPrefect(row)) ?? "",
    renderCell: ({ row }) => {
        const name = prefectName(getPrefect(row))
        return (
            <div className="h-full flex items-center">
                {name
                    ? <span className="text-[0.85em] font-medium text-gray-800">{name}</span>
                    : <span className="text-[0.85em] text-gray-400">—</span>}
            </div>
        )
    },
})
