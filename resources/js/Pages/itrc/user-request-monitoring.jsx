import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { Head } from "@inertiajs/react"

const UserRequestMonitoring = (props) => {
    return (
        <>
            <Head title="User Request Monitoring" />
            <PageLayout title="User Request Monitoring">
                {/* Content for user request monitoring goes here */}
            </PageLayout>
        </>
    )
}

UserRequestMonitoring.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default UserRequestMonitoring
