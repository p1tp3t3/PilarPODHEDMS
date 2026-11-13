import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import UserReportLogList from "@/Components/list/user-report-log-list"
import DropdownField from "@/Components/input/dropdown"
import { toTitleCase } from "@/others/function"
import { Head, router } from "@inertiajs/react"

// My Activity: the signed-in user's own action log.
const MyActivity = (props) => {
    const types = (props.action_types ?? []).map((t) => ({ val: t, label: toTitleCase(t.replace(/_/g, " ")) }))

    const current = {
        action_type: props.action_type ?? "all",
        "school-year": props.school_year ?? "all",
        semester: props.semester ?? "all",
    }

    // Changes one filter, keeping the others.
    const filter = (key, value) => {
        const next = { ...current, [key]: value }
        const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v && v !== "all")).toString()
        router.visit(`/my-activity${q ? `?${q}` : ""}`, { preserveScroll: true })
    }

    return (
        <>
            <Head title="My Activity" />
            <PageLayout title="MY ACTIVITY">
                <div className="grid gap-5 min-w-0">
                    <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                        <p className="text-[0.9em] text-gray-600">Everything you've done in the system.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                            <div className="sm:w-48">
                                <DropdownField
                                    default={{ val: "all", label: "All School Years" }}
                                    list={(props.school_years ?? []).map((y) => ({ val: y, label: y }))}
                                    val={current["school-year"]}
                                    onChange={(e) => filter("school-year", e.target.value)}
                                    name="activity_school_year"
                                    keepCase={true}
                                />
                            </div>
                            <div className="sm:w-48">
                                <DropdownField
                                    default={{ val: "all", label: "All Semesters" }}
                                    list={[{ val: "1", label: "1st Semester" }, { val: "2", label: "2nd Semester" }]}
                                    val={String(current.semester)}
                                    onChange={(e) => filter("semester", e.target.value)}
                                    name="activity_semester"
                                    keepCase={true}
                                />
                            </div>
                            <div className="sm:w-52">
                                <DropdownField
                                    default={{ val: "all", label: "All Actions" }}
                                    list={types}
                                    val={current.action_type}
                                    onChange={(e) => filter("action_type", e.target.value)}
                                    name="action_type"
                                    keepCase={true}
                                />
                            </div>
                        </div>
                    </div>
                    <UserReportLogList list={props.logs} showUser={false} />
                </div>
            </PageLayout>
        </>
    )
}

MyActivity.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default MyActivity
