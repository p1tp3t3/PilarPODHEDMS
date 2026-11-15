import useListData from "@/others/hooks/use-list-data"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import ParentList from "@/Components/list/parent-list"
import { Head } from "@inertiajs/react"

const PrefectParentList = (props) => {
    // The table loads from /api/prefect/parent-list once the page opens.
    const { data: lists } = useListData()
    return (
        <>
            <Head title="Parent List" />
            <PageLayout title="PARENT LIST">
                    <ParentList list={lists?.parents} />
            </PageLayout>
        </>
    )
}

PrefectParentList.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectParentList
