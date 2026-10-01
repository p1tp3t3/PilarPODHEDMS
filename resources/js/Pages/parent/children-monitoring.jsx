import ChildrenList from "@/Components/list/children-list"
import AuthLayout from "@/Layouts/auth-layout"
import { Head } from "@inertiajs/react"

const ChildrenMonitoring = (props) => {
    console.log(props.children)
    return (
        <>
            <Head title="Children Monitoring" />
            <div className="w-full py-10">
                <div className="w-full grid gap-10 relative">
                    <div className="flex justify-between items-center">
                        <h1 className="text-[1.4em]">
                            <b>Children Monitoring</b>
                        </h1>
                    </div>
                    <div>
                        <ChildrenList list={props.children} style={true} />
                    </div>
                </div>
            </div>
        </>
    )
}

ChildrenMonitoring.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ChildrenMonitoring