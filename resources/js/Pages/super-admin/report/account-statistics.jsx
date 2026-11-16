import { useEffect, useState } from "react"
import ReportFilterModal, { EMPTY_REPORT_FILTER, isUsableReportFilter, reportFilterSummary } from "@/Components/modal/submission-form/report-filter-modal"
import { DataGrid } from "@/Components/other/data-grid"
import { Box, Button, IconButton, Typography } from "@mui/material"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { SlidersHorizontal, X } from "lucide-react"
import ReportStatistics from "@/Pages/prefect/report/report-statistics"

const AccountStatistics = ({ initial, schoolYears }) => {
    // Edited in a modal (Filter button); the statistics reload once applied.
    const [filterModal, openFilterModal] = useState(false)
    const [filter, setFilter] = useState(EMPTY_REPORT_FILTER)
    const [stats, setStats] = useState(initial)

    const currentFilters = () => ({
        filter_by: filter.filter_by,
        ...(filter.filter_by === "date"
            ? { date_from: filter.date_from, date_to: filter.date_to }
            : { school_year_id: filter.school_year_id, semester: filter.semester }),
    })

    const hasUsableFilter = isUsableReportFilter(filter)

    useEffect(() => {
        // Cleared: back to the unfiltered totals the page loaded with.
        if (!hasUsableFilter) {
            setStats(initial)
            return
        }

        ReportArchiveService.getAccountStatisticsPreview(currentFilters(), setStats)
    }, [filter])

    // Records: accounts per program (students, program heads, faculty).
    const programAccounts = stats?.program_accounts ?? []

    return (
        <div className="w-full grid gap-6 min-w-0">
            <ReportFilterModal
                close={filterModal}
                closeModal={openFilterModal}
                value={filter}
                schoolYears={schoolYears}
                onApply={setFilter}
                onClear={() => setFilter(EMPTY_REPORT_FILTER)}
                allSemestersLabel="All Semesters (Students Only)"
            />

            <div className="flex flex-wrap items-center justify-end gap-3 min-w-0">
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {hasUsableFilter &&
                    <span className="flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
                        <span className="truncate">{reportFilterSummary(filter, schoolYears)}</span>
                        <IconButton size="small" onClick={() => setFilter(EMPTY_REPORT_FILTER)} title="Clear filter" aria-label="Clear filter" sx={{ p: 0.25, color: "inherit" }}>
                            <X size={13} />
                        </IconButton>
                    </span>}
                    <Button
                        variant={hasUsableFilter ? "contained" : "outlined"}
                        disableElevation
                        onClick={() => openFilterModal(true)}
                        startIcon={<SlidersHorizontal size={16} />}
                        sx={{
                            textTransform: "none", fontSize: "0.9em", borderRadius: "0.375rem", px: 2,
                            ...(hasUsableFilter
                                ? { bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" } }
                                : { bgcolor: "background.paper", color: "text.primary", borderColor: "divider" }),
                        }}
                    >
                        Filter
                    </Button>
                </div>
            </div>

            {/* Key figures and charts: accounts, account setup, students,
                staff, parents, system activity and security events. */}
            <ReportStatistics stats={stats?.cards ? stats : null} />

            {/* Records: accounts per program. */}
            <div className="grid gap-2 min-w-0">
                <Typography sx={{ fontWeight: 700, fontSize: "1.05em" }}>Accounts per Program</Typography>
                <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                    <DataGrid
                        rows={programAccounts.map((e, i) => ({ id: i, ...e }))}
                        loading={!stats?.program_accounts}
                        columns={[
                            { field: "program", headerName: "Program", width: 120 },
                            { field: "name", headerName: "Program Name", flex: 1, minWidth: 220 },
                            { field: "students", headerName: "Students", width: 120, align: "center", headerAlign: "center" },
                            { field: "program_heads", headerName: "Program Heads", width: 140, align: "center", headerAlign: "center" },
                            { field: "faculty", headerName: "Faculty", width: 120, align: "center", headerAlign: "center" },
                            { field: "total", headerName: "Total", width: 110, align: "center", headerAlign: "center" },
                        ]}
                        hideFooter
                        disableRowSelectionOnClick
                        showToolbar
                        localeText={{ noRowsLabel: "No programs found" }}
                        mobileSummary={(row) => ({ name: `${row.program} — ${row.name}`, role: `${row.total} accounts`, hide: ["program", "name"] })}
                    />
                </Box>
            </div>
        </div>
    )
}

export default AccountStatistics
