import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import ParentList from "@/Components/list/parent-list"
import { Head } from "@inertiajs/react"

const PrefectParentList = (props) => {
    return (
        <>
            <Head title="Parent List" />
            <PageLayout title="PARENT LIST">
                    <ParentList list={props.parents} />
            </PageLayout>
        </>
    )
}

PrefectParentList.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectParentList
