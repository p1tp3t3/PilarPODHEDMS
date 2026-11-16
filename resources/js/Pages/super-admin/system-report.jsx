import { useMemo, useState } from "react"
import axios from "axios"
import { Head } from "@inertiajs/react"
import { Box, Button, Chip, Tooltip, Typography } from "@mui/material"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import ActionBtn from "@/Components/button/action-btn"
import { DataGrid } from "@/Components/other/data-grid"
import ReportStatistics from "@/Pages/prefect/report/report-statistics"
import ReportGenerator from "@/Components/report-generator/report-generator"
import SystemReportFilterModal from "./report/system-report-filter-modal"
import { useReload } from "@/context-provider/reload-provider"
import { showOutputModal, showWarningModal } from "@/others/function"
import useListData, { reloadListData, setListQuery, useListQuery } from "@/others/hooks/use-list-data"

// The super admin's other report pages (/super-admin/report/{section}):
// Account Activity, Account Setup, Enrollment, and the Report Generator
// (with its Generated Reports tab). Each page's figures, charts and table
// come from its API (SystemReportController); filters refetch it. Files are
// made in the Report Generator.
const TITLES = {
    "account-activity": "Account Activity",
    "account-setup": "Account Setup",
    enrollment: "Enrollment",
    generator: "Report Generator",
    generated: "Report Generator",
}

const ROLES = [
    { val: "student", label: "Students" },
    { val: "program_head", label: "Program Heads" },
    { val: "faculty", label: "Faculty" },
    { val: "non_teaching_staff", label: "Non-Teaching Staff" },
    { val: "parent", label: "Parents" },
    { val: "sub_admin", label: "Prefect" },
]

const STATUS_CHIP = {
    active: { label: "Active", color: "success" },
    inactive: { label: "Inactive (30+ days)", color: "warning" },
    never: { label: "Never logged in", color: "error" },
    profile: { label: "Profile not set up", color: "warning" },
    password: { label: "Must change password", color: "error" },
}
const StatusChip = ({ value }) => {
    const s = STATUS_CHIP[value]
    return s ? <Chip size="small" label={s.label} color={s.color} variant="outlined" sx={{ fontWeight: 600 }} /> : null
}

// One filter dropdown, kept in the address bar (?key=); a change refetches the page's API.
const Filter = ({ name, value, list, all, onChange }) => (
    <div className="w-full sm:w-56">
        <DropdownField default={all ? { val: "all", label: all } : null} list={list} val={value} onChange={(e) => onChange(name, e.target.value)} name={name} keepCase />
    </div>
)

const SystemReport = (props) => {
    const section = props.section
    const { data: lists } = useListData()
    const report = lists?.report ?? null
    const query = useListQuery()
    const { loadRegister } = useReload()
    // Report Generator: its tab, and the filter form (new / edit).
    const [generatorTab, setGeneratorTab] = useState(section === "generated" ? "generated" : "filters")
    const [formOpen, openForm] = useState(false)
    const [editing, setEditing] = useState(null)

    const setFilter = (name, value) => {
        const next = new URLSearchParams(window.location.search)
        if (value && value !== "all") next.set(name, value)
        else next.delete(name)
        setListQuery(next)
    }

    // ---- filters per page ----
    const filters = {
        "account-activity": [
            { name: "days", value: query.get("days") ?? "30", list: [{ val: "7", label: "Last 7 days" }, { val: "30", label: "Last 30 days" }, { val: "90", label: "Last 90 days" }, { val: "365", label: "Last 12 months" }] },
            { name: "role", value: query.get("role") ?? "all", list: ROLES, all: "All Roles" },
            { name: "status", value: query.get("status") ?? "all", list: [{ val: "active", label: "Active" }, { val: "inactive", label: "Inactive (30+ days)" }, { val: "never", label: "Never logged in" }], all: "All Statuses" },
        ],
        "account-setup": [
            { name: "role", value: query.get("role") ?? "all", list: ROLES, all: "All Roles" },
            { name: "issue", value: query.get("issue") ?? "all", list: [{ val: "profile", label: "Profile not set up" }, { val: "password", label: "Must change password" }], all: "All Pending" },
        ],
        enrollment: [
            { name: "school-year", value: query.get("school-year") ?? report?.filter?.school_year ?? "all", list: (props.school_years ?? []).map((y) => ({ val: y, label: `SY ${y}` })), all: "All School Years" },
            { name: "semester", value: query.get("semester") ?? report?.filter?.semester ?? "all", list: [{ val: "1", label: "1st Semester" }, { val: "2", label: "2nd Semester" }], all: "All Semesters" },
        ],
    }[section] ?? []

    // ---- row actions ----
    const resetPassword = (row) => {
        showWarningModal(`Reset ${row.name}'s password to the default? They'll be signed out and must set a new one at their next login.`, "Reset Password", "Cancel", () => {
            loadRegister(true, "text-wait", "Resetting password...")
            axios.post(`/super-admin/user-accounts/${row.id}/reset-password`)
                .then((res) => {
                    loadRegister(true, "")
                    showOutputModal("Password Reset", "s", () => { loadRegister(false); reloadListData() },
                        `<div>The password is now <b>${res.data.password}</b>.</div><div style="font-size:0.9em;color:#555;margin-top:6px">${row.name} must change it at their next login.</div>`)
                })
                .catch((e) => {
                    loadRegister(true, "")
                    showOutputModal(e.response?.data?.message ?? "Failed to reset the password", "e", () => loadRegister(false))
                })
        })
    }
    const deleteReport = (row) => {
        showWarningModal(`Delete "${row.name}"? The file is removed too.`, "Delete", "Cancel", () => {
            loadRegister(true, "text-wait", "Deleting Report")
            axios.post(`/super-admin/report/delete/${row.id}`)
                .then(() => { loadRegister(true, ""); showOutputModal("Report Deleted", "s", () => { loadRegister(false); reloadListData() }) })
                .catch(() => { loadRegister(true, ""); showOutputModal("Failed to Delete Report", "e", () => loadRegister(false)) })
        })
    }

    // ---- table columns ----
    const columns = useMemo(() => {
        if (section === "generated") {
            return [
                { field: "name", headerName: "Report", flex: 1, minWidth: 240 },
                { field: "file_type", headerName: "File", width: 100, renderCell: ({ value }) => <Chip size="small" label={String(value ?? "").toUpperCase()} variant="outlined" color={value === "pdf" ? "error" : "success"} /> },
                { field: "created", headerName: "Generated", width: 200 },
                {
                    field: "actions", headerName: "Action", width: 260, sortable: false, filterable: false,
                    renderCell: ({ row }) => (
                        <div className="flex gap-2 items-center h-full">
                            {row.view_url && <ActionBtn onClick={() => window.open(row.view_url, "_blank")} className="bg-blue-600 text-white hover:bg-blue-700">View</ActionBtn>}
                            <ActionBtn onClick={() => { window.location.href = row.download_url }} className="bg-green-600 text-white hover:bg-green-700">Download</ActionBtn>
                            <ActionBtn onClick={() => deleteReport(row)} className="bg-red-600 text-white hover:bg-red-700">Delete</ActionBtn>
                        </div>
                    ),
                },
            ]
        }
        const cols = (report?.table?.columns ?? []).map((c) => {
            const base = { field: c.field, headerName: c.label, flex: ["name", "role_label"].includes(c.field) ? 1 : undefined, minWidth: 110, width: ["name"].includes(c.field) ? undefined : 150 }
            if (c.field === "name") return { ...base, minWidth: 200 }
            if (c.field === "status_label") return { ...base, field: "status", width: 190, renderCell: ({ row }) => <StatusChip value={row.status} /> }
            if (c.field === "issue_label") return { ...base, field: "issue", width: 200, renderCell: ({ row }) => <StatusChip value={row.issue} /> }
            if (["logins", "year1", "year2", "year3", "year4", "new", "total"].includes(c.field)) return { ...base, width: 110, align: "center", headerAlign: "center" }
            if (c.field === "program") return { ...base, width: 120 }
            if (c.field === "name" || c.field === "role_label") return base
            return base
        })
        if (section === "account-setup") {
            cols.push({
                field: "actions", headerName: "Action", width: 170, sortable: false, filterable: false,
                renderCell: ({ row }) => (
                    <div className="flex items-center h-full">
                        <Tooltip title={row.can_reset ? "" : "No ID number or last name, so there's no default password."} arrow>
                            <span><ActionBtn onClick={() => resetPassword(row)} disabled={!row.can_reset} className="bg-blue-600 text-white hover:bg-blue-700">Reset Password</ActionBtn></span>
                        </Tooltip>
                    </div>
                ),
            })
        }
        return cols
    }, [section, report])

    const rows = report?.table?.rows ?? []
    const hasStats = report && (report.cards?.length || report.charts?.length)

    // Report Generator (shared with the prefect), with its Generated Reports tab.
    if (section === "generator" || section === "generated") {
        return (
            <>
                <Head title="Report Generator" />
                <SystemReportFilterModal
                    close={formOpen}
                    closeModal={openForm}
                    editing={editing}
                    reportTypes={props.report_types ?? []}
                    schoolYears={props.school_years ?? []}
                    actionTypes={props.action_types ?? []}
                    reload={loadRegister}
                />
                <PageLayout title="REPORT GENERATOR">
                    <ReportGenerator
                        tab={generatorTab}
                        onTabChange={(key) => {
                            setGeneratorTab(key)
                            window.history.replaceState(window.history.state, "", key === "generated" ? "/super-admin/report/generated" : "/super-admin/report/generator")
                        }}
                        filters={report?.filters ?? null}
                        generated={report ? report.table?.rows ?? [] : null}
                        typeOptions={(props.report_types ?? []).map((t) => ({ val: t.val, label: `${t.label} Report` }))}
                        schoolYears={props.school_years ?? []}
                        generate={(id, fileType) => axios.post(`/super-admin/report-filter/${id}/generate`, { file_type: fileType })}
                        deleteFilter={(id) => axios.post(`/super-admin/report-filter/${id}/delete`)}
                        deleteReport={(id) => axios.post(`/super-admin/report/delete/${id}`)}
                        onNew={() => { setEditing(null); openForm(true) }}
                        onEdit={(row) => { setEditing(row); openForm(true) }}
                        onChanged={reloadListData}
                    />
                </PageLayout>
            </>
        )
    }

    return (
        <>
            <Head title={TITLES[section]} />
            <PageLayout title={TITLES[section].toUpperCase()}>
                {filters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 min-w-0">
                        <MobileFilters active={countActive(...filters.map((f) => (f.name === "days" ? "all" : f.value)))}>
                            <div className="flex flex-wrap gap-3">
                                {filters.map((f) => <Filter key={f.name} {...f} onChange={setFilter} />)}
                            </div>
                        </MobileFilters>
                    </div>
                )}

                {report?.period && <Typography sx={{ color: "text.secondary", fontSize: "0.9em", mt: -1 }}>Showing: {report.period}</Typography>}

                {section !== "generated" && <ReportStatistics stats={report ? (hasStats ? report : { cards: [], charts: [] }) : null} />}

                <div className="grid gap-2 min-w-0">
                    {section !== "generated" && <Typography sx={{ fontWeight: 700, fontSize: "1.05em" }}>Records</Typography>}
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                        <DataGrid
                            rows={rows}
                            loading={!report}
                            columns={columns}
                            getRowId={(row) => row.id}
                            disableRowSelectionOnClick
                            showToolbar
                            pagination
                            pageSizeOptions={[10, 20, 50, 100]}
                            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                            localeText={{ noRowsLabel: section === "generated" ? "No generated reports yet" : "No records for this filter" }}
                            mobileSummary={(row) => ({
                                name: row.name ?? row.program,
                                role: section === "enrollment" ? `${row.total} students` : section === "generated" ? row.created : (row.role_label ?? ""),
                                hide: ["name"],
                            })}
                        />
                    </Box>
                </div>
            </PageLayout>
        </>
    )
}

SystemReport.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SystemReport
