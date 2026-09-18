import { useEffect, useState } from "react"
import RadioButton from "@/Components/input/radio"
import DropdownField from "@/Components/input/dropdown"
import BetweenTextfield from "@/Components/input/between-input"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import Btn from "@/Components/button/normal-btn"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { configBroadcast } from "@/others/function"

const semesterList = [
    { val: 1, label: "1st Semester" },
    { val: 2, label: "2nd Semester" },
]

const AccountStatistics = ({ initial, schoolYears, userId }) => {
    const [filterBy, setFilterBy] = useState("date")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [schoolYearId, setSchoolYearId] = useState("")
    const [semester, setSemester] = useState("")
    const [stats, setStats] = useState(initial)

    const [exportStatus, setExportStatus] = useState("idle") // idle | queued | ready | failed
    const [exportUrl, setExportUrl] = useState(null)
    const [exportViewUrl, setExportViewUrl] = useState(null)

    const currentFilters = () => ({
        filter_by: filterBy,
        ...(filterBy === "date"
            ? { date_from: dateFrom, date_to: dateTo }
            : { school_year_id: schoolYearId, semester }),
    })

    const hasUsableFilter = filterBy === "date" ? (dateFrom && dateTo) : !!schoolYearId

    useEffect(() => {
        if (!hasUsableFilter) return

        ReportArchiveService.getAccountStatisticsPreview(currentFilters(), setStats)
    }, [filterBy, dateFrom, dateTo, schoolYearId, semester])

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
        { label: "Students", value: stats.students, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", value_text: "text-blue-600" },
        { label: "Teaching Staff", value: stats.teaching_staff, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", value_text: "text-yellow-600" },
        { label: "Non-Teaching Staff", value: stats.non_teaching_staff, bg: "bg-green-50", border: "border-green-200", text: "text-green-800", value_text: "text-green-600" },
        { label: "Parents", value: stats.parents, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", value_text: "text-purple-600" },
    ]

    const studentsPerProgram = stats.students_per_program ?? []

    return (
        <div className="w-full grid gap-6 min-w-0">
            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-5 grid gap-4 min-w-0">
                <RadioButton
                    list={[
                        { val: "date", label: "Date Range" },
                        { val: "school_year", label: "School Year" },
                    ]}
                    id="filter_by"
                    name="filter_by"
                    val={filterBy}
                    change={(e) => {
                        setFilterBy(e.target.value)
                        setDateFrom("")
                        setDateTo("")
                        setSchoolYearId("")
                        setSemester("")
                    }}
                />

                {filterBy === "date" &&
                <div className="max-w-md">
                    <BetweenTextfield
                        type="date"
                        labels={["Date From", "Date To"]}
                        name={["date_from", "date_to"]}
                        id={["date_from", "date_to"]}
                        data={[dateFrom, dateTo]}
                        setData={(updater) => {
                            const next = typeof updater === "function" ? updater({ date_from: dateFrom, date_to: dateTo }) : updater
                            setDateFrom(next.date_from ?? "")
                            setDateTo(next.date_to ?? "")
                        }}
                    />
                </div>}

                {filterBy === "school_year" &&
                <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                    <div className="w-full">
                        <DropdownField
                            default={{ val: "", label: "Select School Year" }}
                            list={schoolYears.map((y) => ({ val: y.id, label: y.year }))}
                            onChange={(e) => setSchoolYearId(e.target.value)}
                            name="school_year_id"
                            val={schoolYearId}
                        />
                    </div>
                    <div className="w-full">
                        <DropdownField
                            default={{ val: "", label: "All Semesters (Students Only)" }}
                            list={semesterList}
                            onChange={(e) => setSemester(e.target.value)}
                            name="semester"
                            val={semester}
                        />
                    </div>
                </div>}

                <div className="flex flex-wrap items-center gap-3 pt-1">
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
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {cards.map((c) => (
                    <div key={c.label} className={`${c.bg} p-4 rounded-lg border ${c.border}`}>
                        <h2 className={`text-[1em] sm:text-[1.1em] font-semibold ${c.text}`}>{c.label}</h2>
                        <p className={`text-2xl sm:text-3xl font-bold ${c.value_text}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-6">
                <h2 className="text-[1.1em] mb-4 font-bold">Students Per Program</h2>

                {studentsPerProgram.length > 0 &&
                <div className="mb-5 h-[18rem]">
                    <BarGraph
                        label={studentsPerProgram.map((e) => e.program)}
                        dataset={[{
                            label: "Students",
                            data: studentsPerProgram.map((e) => e.total),
                            backgroundColor: "#3b82f6",
                        }]}
                        title="Students Per Program"
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
