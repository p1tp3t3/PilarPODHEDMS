import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import UserReportLogList from "@/Components/list/user-report-log-list"
import DropdownField from "@/Components/input/dropdown"
import { toTitleCase } from "@/others/function"
import { Head, router } from "@inertiajs/react"

// My Activity: the signed-in user's own action log.
const MyActivity = (props) => {
    const types = (props.action_types ?? []).map((t) => ({ val: t, label: toTitleCase(t.replace(/_/g, " ")) }))

    const filter = (value) => {
        router.visit(`/my-activity${value && value !== "all" ? `?action_type=${encodeURIComponent(value)}` : ""}`, {
            preserveScroll: true,
        })
    }

    return (
        <>
            <Head title="My Activity" />
            <PageLayout
                title="MY ACTIVITY"
                rightSideComponent={
                    <div className="w-40 sm:w-56">
                        <DropdownField
                            default={{ val: "all", label: "All Actions" }}
                            list={types}
                            val={props.action_type ?? "all"}
                            onChange={(e) => filter(e.target.value)}
                            name="action_type"
                        />
                    </div>
                }
            >
                <p className="text-[0.85em] text-gray-600 -mt-2">
                    Everything you've done in the system.
                </p>
                <UserReportLogList list={props.logs} showUser={false} />
            </PageLayout>
        </>
    )
}

MyActivity.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default MyActivity
