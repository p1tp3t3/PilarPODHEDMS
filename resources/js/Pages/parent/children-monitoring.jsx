import ChildrenList from "@/Components/list/children-list"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { Head } from "@inertiajs/react"
import useListData from "@/others/hooks/use-list-data"

const ChildrenMonitoring = () => {
    // The list loads from /api/children/monitor once the page opens.
    const { data: lists } = useListData()

    return (
        <>
            <Head title="Children Monitoring" />
            <PageLayout title="CHILDREN MONITORING">
                <ChildrenList list={lists?.children ?? null} style={true} />
            </PageLayout>
        </>
    )
}

ChildrenMonitoring.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ChildrenMonitoring
