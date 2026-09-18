import AuthLayout from "@/Layouts/auth-layout"
import StudentViolationList from "@/Components/list/student-violation-list"
import TabSwitcher from "@/Components/other/tab-switcher"
import { Head, Link } from "@inertiajs/react"
import { Chip, Paper } from "@mui/material"
import { useState } from "react"
import { ordinal } from "@/others/function"

const ViolationStudents = ({ user, violation, students, occurrence_breakdown = [] }) => {
    const isSuperAdmin = user?.role === 'super_admin';
    const [tab, setTab] = useState("occurrences")

    const occurrenceCount = (occ) =>
        occurrence_breakdown.find((o) => o.occurrence === occ)?.student_count ?? 0

    return (
        <>
            <Head title={`Violation — ${violation.violation_name}`} />
            <div className="w-full py-4 grid gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">{violation.violation_name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Chip
                                label={violation.offense_status ? "Major" : "Minor"}
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    backgroundColor: violation.offense_status ? "#fee2e2" : "#fef3c7",
                                    color: violation.offense_status ? "#b91c1c" : "#b45309",
                                }}
                            />
                            <span className="text-[0.9em] text-gray-600">
                                {students.length} student{students.length !== 1 ? "s" : ""} with this violation
                            </span>
                        </div>

                        {violation.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {violation.keywords.map((kw, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full"
                                    >
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <Link href="/violation-management" className="text-[0.85em] text-gray-600 hover:text-gray-900">
                        <i className="fa-solid fa-arrow-left"></i> Back to Violation Management
                    </Link>
                </div>

                <TabSwitcher
                    tabs={[
                        { key: "occurrences", label: "Occurrences & Penalties" },
                        ...(isSuperAdmin ? [] : [{ key: "students", label: "Students" }]),
                    ]}
                    value={tab}
                    onChange={setTab}
                />

                {tab === "occurrences" && (
                    <Paper elevation={2} sx={{ p: 3, borderRadius: "0.5rem" }}>
                        {(() => {
                            const rows = [1, 2, 3, 4, 5, 6]
                                .map((occ) => ({
                                    occ,
                                    studentCount: occurrenceCount(occ),
                                    penalties: violation.penalties?.filter((p) => p.occurrence == occ) ?? [],
                                }))
                                .filter((r) => r.studentCount > 0 || r.penalties.length > 0)

                            if (rows.length === 0) {
                                return <p className="text-[0.85em] text-gray-500">No occurrences or penalties recorded yet.</p>
                            }

                            return (
                                <div className="grid gap-4">
                                    {rows.map((r) => (
                                        <div key={r.occ} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-[0.9em] font-semibold">{ordinal(r.occ)} Offense</h3>
                                                <span className="text-[0.85em] text-gray-600">
                                                    {r.studentCount} student{r.studentCount !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {r.penalties.length !== 0 ? (
                                                    r.penalties.map((p, i) => (
                                                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-[0.8em] rounded-full">
                                                            {p.penalty?.ref_number != null
                                                                ? `${p.penalty.ref_number} — ${p.penalty.description}`
                                                                : p.penalty?.description}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[0.8em] text-gray-400 italic">No penalty configured</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}
                    </Paper>
                )}

                {tab === "students" && !isSuperAdmin && <StudentViolationList list={students} />}
            </div>
        </>
    )
}

ViolationStudents.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ViolationStudents
