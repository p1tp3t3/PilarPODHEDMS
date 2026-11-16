import useListData, { setListQuery, useListQuery } from "@/others/hooks/use-list-data"
import StudentList from "@/Components/list/student-list"
import FacultyList from "@/Components/list/faculty-list"
import AccountFilesTab from "@/Components/other/account-files-tab"
import TabSwitcher from "@/Components/other/tab-switcher"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { Head, router } from "@inertiajs/react"
import SchoolYearSemesterFilter from "@/Components/input/school-year-semester-filter"

const tabs = [
    { key: "students", label: "Students" },
    { key: "faculty", label: "Faculty" },
    { key: "files", label: "Account Files" },
]

const ProgramAccountFiles = (props) => {
    // The tables load from /api/program/account-files once the page opens.
    const { data: lists } = useListData()
    const activeTab = useListQuery().get("tab") || "students"
    // Switching tabs keeps the school year / semester filters.
    const goToTab = (tab) => {
        const q = new URLSearchParams(window.location.search)
        q.set("tab", tab)
        // Both tables are already loaded: the address bar follows, the lists refresh.
        setListQuery(q)
    }

    return (
        <>
        <Head title="Program Accounts" />
        <PageLayout title={`${props.program_name ?? ""} ACCOUNTS`.trim()}>
            <TabSwitcher tabs={tabs} value={activeTab} onChange={goToTab} />

            {/* Students: enrolled in that period. Faculty: registered in it. */}
            {activeTab !== "files" && <SchoolYearSemesterFilter schoolYears={props.school_years} />}

            {activeTab === "students" && <StudentList list={lists?.students} type="program_head" />}
            {activeTab === "faculty" && <FacultyList list={lists?.faculty} type="program_head" />}
            {activeTab === "files" && <AccountFilesTab files={props.account_files} canDelete={false} showRoleFilter={false} />}
        </PageLayout>
        </>
    )
}

ProgramAccountFiles.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default ProgramAccountFiles
