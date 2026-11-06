import { useEffect, useMemo, useState } from "react"
import { Link } from "@inertiajs/react"
import Box from "@mui/material/Box"
import { DataGrid } from "@/Components/other/data-grid"
import ProfilePic from "@/Components/other/profile-pic"
import ActionBtn from "@/Components/button/action-btn"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import { AppointmentService } from "@/others/services/appointment-service"
import { getProfilePic, profileUrl, readableDate, readableTime } from "@/others/function"

/**
 * The prefect's history of call-ins: which student was called in, why, by
 * whom, when, and whether the student has opened it yet. Loaded when the
 * tab is opened; `refreshKey` reloads it (e.g. after a new call-in).
 */
const FILTER_KEYS = ["school-year", "semester", "program"]
const semesterList = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]

const CallInHistoryList = ({ refreshKey = 0, schoolYears = [], programs = [] }) => {
    const [list, setList] = useState(null)
    const [failed, setFailed] = useState(false)

    // School year / semester / program, read from and kept in the URL.
    const [filters, setFilters] = useState(() => {
        const url = new URLSearchParams(window.location.search)
        return Object.fromEntries(FILTER_KEYS.map((k) => [k, url.get(k) || "all"]))
    })
    const changeFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
        const url = new URL(window.location.href)
        if (value && value !== "all") url.searchParams.set(key, value)
        else url.searchParams.delete(key)
        window.history.replaceState(window.history.state, "", url)
    }

    useEffect(() => {
        setList(null)
        setFailed(false)
        AppointmentService.getCallInHistory(filters, setList, () => setFailed(true))
    }, [refreshKey, filters])

    const rows = useMemo(() => (list ?? []).map((e, i) => ({ ...e, i: i + 1 })), [list])

    const columns = useMemo(() => [
        { field: "i", headerName: "#", width: 55 },
        {
            field: "student",
            headerName: "Student",
            flex: 1.2,
            minWidth: 220,
            valueGetter: (_, row) => row.student?.name ?? "Deleted account",
            renderCell: ({ row, value }) => (
                <div className="flex items-center gap-3 h-full py-1">
                    <ProfilePic size={1.9} src={getProfilePic(row.student?.profile_picture, row.student?.sex)} />
                    <div className="leading-tight min-w-0">
                        <div className="text-[0.8em] font-bold truncate">{value}</div>
                        <div className="text-[0.7em] text-gray-500">{row.student?.id_number}</div>
                    </div>
                </div>
            ),
        },
        { field: "program", headerName: "Program", width: 110, valueGetter: (_, row) => row.student?.program ?? "N/A" },
        { field: "reason", headerName: "Reason", flex: 1.5, minWidth: 220, valueGetter: (v) => v ?? "N/A" },
        { field: "called_by", headerName: "Called In By", width: 160, valueGetter: (v) => v ?? "N/A" },
        {
            field: "created_at",
            headerName: "Date / Time",
            width: 150,
            renderCell: ({ value }) => (
                <div className="leading-tight">
                    <div className="text-[0.85em]">{readableDate(value)}</div>
                    <div className="text-[0.7em] text-gray-500">{readableTime(value)}</div>
                </div>
            ),
        },
        {
            field: "read_since",
            headerName: "Status",
            width: 120,
            valueGetter: (v) => (v ? "Seen" : "Not seen yet"),
            renderCell: ({ row, value }) => (
                <span
                    title={row.read_since ? `Seen ${readableDate(row.read_since)} (${readableTime(row.read_since)})` : undefined}
                    className={`px-2 py-0.5 rounded-full text-[0.75em] font-medium ${
                        row.read_since ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                >
                    {value}
                </span>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 100,
            renderCell: ({ row }) => row.student && (
                <Link href={profileUrl(row.student)}>
                    <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700">View</ActionBtn>
                </Link>
            ),
        },
    ], [])

    return (
        <div className="grid gap-4 min-w-0">
        <div className="w-full flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <MobileFilters active={countActive(filters["school-year"], filters.semester, filters.program)}>
                <div className="w-full sm:w-48">
                    <DropdownField
                        default={{ val: "all", label: "All School Years" }}
                        list={schoolYears.map((y) => ({ val: y, label: y }))}
                        val={filters["school-year"]}
                        onChange={(e) => changeFilter("school-year", e.target.value)}
                        name="call_in_school_year"
                    />
                </div>
                <div className="w-full sm:w-44">
                    <DropdownField
                        default={{ val: "all", label: "All Semesters" }}
                        list={semesterList}
                        val={filters.semester === "all" ? "all" : Number(filters.semester)}
                        onChange={(e) => changeFilter("semester", e.target.value)}
                        name="call_in_semester"
                    />
                </div>
                <div className="w-full sm:w-56">
                    <DropdownField
                        default={{ val: "all", label: "All Programs" }}
                        list={programs.map((p) => ({ val: p.id, label: p.name }))}
                        val={filters.program === "all" ? "all" : Number(filters.program)}
                        onChange={(e) => changeFilter("program", e.target.value)}
                        name="call_in_program"
                        keepCase={true}
                    />
                </div>
            </MobileFilters>
        </div>
        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={list === null && !failed}
                mobileSummary={(row) => ({
                    name: row.student?.name ?? "Deleted account",
                    role: row.student?.id_number,
                    picture: row.student?.profile_picture,
                    sex: row.student?.sex,
                    hide: ["student"],
                })}
                disableRowSelectionOnClick
                getRowHeight={() => "auto"}
                showToolbar
                pagination
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                pageSizeOptions={[20, 50, 100]}
                localeText={{ noRowsLabel: failed ? "Failed to load the call-in history." : "No call-ins yet." }}
            />
        </Box>
        </div>
    )
}

export default CallInHistoryList
