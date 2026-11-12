import { useEffect, useState } from "react"
import ReportFilterModal, { EMPTY_REPORT_FILTER, isUsableReportFilter, reportFilterSummary } from "@/Components/modal/submission-form/report-filter-modal"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import Btn from "@/Components/button/normal-btn"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { configBroadcast } from "@/others/function"
import { SlidersHorizontal, X, GraduationCap, Presentation, Briefcase, Users } from "lucide-react"
import QuantityCard from "@/Components/card/qntty-statistic-card"

const AccountStatistics = ({ initial, schoolYears, userId }) => {
    // Edited in a modal (Filter button); the statistics reload once applied.
    const [filterModal, openFilterModal] = useState(false)
    const [filter, setFilter] = useState(EMPTY_REPORT_FILTER)
    const [stats, setStats] = useState(initial)

    const [exportStatus, setExportStatus] = useState("idle") // idle | queued | ready | failed
    const [exportUrl, setExportUrl] = useState(null)
    const [exportViewUrl, setExportViewUrl] = useState(null)

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

    useEffect(() => {
        if (!userId) return

        configBroadcast(
            "private",
            `job-status.progress.user.${userId}`,
            "Account statistics report status",
            ".ReportGenerated",
            (e) => {
                if (e.status === "ready") {
                    setExportStatus("ready")
                    setExportUrl(e.download_url)
                    setExportViewUrl(e.view_url)
                } else if (e.status === "failed") {
                    setExportStatus("failed")
                }
            }
        )
    }, [userId])

    const handleExport = () => {
        if (!hasUsableFilter) return

        setExportStatus("queued")
        setExportUrl(null)
        setExportViewUrl(null)

        ReportArchiveService.generateAccountStatisticsReport(currentFilters(), () => {}, () => setExportStatus("failed"))
    }

    const cards = [
        { label: "Students", value: stats.students, icon: GraduationCap },
        { label: "Program Heads", value: stats.program_head, icon: Presentation },
        { label: "Faculty", value: stats.faculty, icon: Presentation },
        { label: "Non-Teaching Staff", value: stats.non_teaching_staff, icon: Briefcase },
        { label: "Parents", value: stats.parents, icon: Users },
    ]

    const studentsPerProgram = stats.students_per_program ?? []

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

            <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <Btn onclick={handleExport}>
                        {exportStatus === "queued" ? "Generating…" : "Export as PDF"}
                    </Btn>
                    {exportStatus === "ready" && exportUrl &&
                    <>
                        {exportViewUrl &&
                        <a
                            href={exportViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded border border-green-600 text-green-700 text-[0.9em] hover:bg-green-50"
                        >
                            View
                        </a>}
                        <a
                            href={exportUrl}
                            className="px-3 py-1.5 rounded bg-green-600 text-white text-[0.9em] hover:bg-green-700"
                        >
                            Download
                        </a>
                    </>}
                    {exportStatus === "failed" &&
                    <span className="text-red-600 text-[0.85em]">Failed to generate report.</span>}
                    {!hasUsableFilter &&
                    <span className="text-gray-500 text-[0.85em]">Set a filter to export.</span>}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {hasUsableFilter &&
                    <span className="flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[0.85em]">
                        <span className="truncate">{reportFilterSummary(filter, schoolYears)}</span>
                        <button
                            type="button"
                            onClick={() => setFilter(EMPTY_REPORT_FILTER)}
                            title="Clear filter"
                            aria-label="Clear filter"
                            className="grid place-items-center w-5 h-5 rounded-full hover:bg-blue-100"
                        >
                            <X size={13} />
                        </button>
                    </span>}
                    <button
                        type="button"
                        onClick={() => openFilterModal(true)}
                        className={`flex items-center gap-2 px-4 py-2 text-[0.9em] rounded border transition-colors ${
                            hasUsableFilter
                                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        <SlidersHorizontal size={16} /> Filter
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {cards.map((c) => (
                    // Same card as the dashboards' quantity cards.
                    <QuantityCard key={c.label} h="h-[6rem]" num={c.value ?? 0} icon={c.icon} label={c.label} />
                ))}
            </div>

            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-6">
                <h2 className="text-[1.1em] mb-4 font-bold">Students Per Program</h2>

                {studentsPerProgram.length > 0 &&
                <div className="mb-5">
                    {/* Fixed chart height so it stays inside its card; the
                        section heading above already names it. */}
                    <BarGraph
                        label={studentsPerProgram.map((e) => e.program)}
                        dataset={[{
                            label: "Students",
                            data: studentsPerProgram.map((e) => e.total),
                            backgroundColor: "#3b82f6",
                        }]}
                        height={260}
                        withBorder
                    />
                </div>}

                <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", height: 350 }}>
                    <DataGrid
                        rows={studentsPerProgram.map((e, i) => ({ id: i, ...e }))}
                        columns={[
                            { field: "index", headerName: "#", width: 60, valueGetter: (v, row) => row.id + 1 },
                            { field: "program", headerName: "Program", flex: 1, minWidth: 200 },
                            { field: "total", headerName: "Students", width: 160 },
                        ]}
                        hideFooter
                        disableRowSelectionOnClick
                        showToolbar
                        localeText={{ noRowsLabel: "No Students Found" }}
                    />
                </Box>
            </div>
        </div>
    )
}

export default AccountStatistics
