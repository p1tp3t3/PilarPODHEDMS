import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import ParentList from "@/Components/list/parent-list"

const PrefectParentList = (props) => {
    return (
        <PageLayout title="PARENT LIST">
                <ParentList list={props.parents} />
        </PageLayout>
    )
}

PrefectParentList.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectParentList
