import ChildrenList from "@/Components/list/children-list"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { Head } from "@inertiajs/react"

const ChildrenMonitoring = (props) => (
    <>
        <Head title="Children Monitoring" />
        <PageLayout title="CHILDREN MONITORING">
            <ChildrenList list={props.children} style={true} />
        </PageLayout>
    </>
)

ChildrenMonitoring.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ChildrenMonitoring
