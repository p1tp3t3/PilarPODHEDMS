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
    const activeTab = new URLSearchParams(window.location.search).get("tab") || "students"
    // Switching tabs keeps the school year / semester filters.
    const goToTab = (tab) => {
        const q = new URLSearchParams(window.location.search)
        q.set("tab", tab)
        router.visit(`/teaching-staff/account-files?${q.toString()}`)
    }

    return (
        <>
        <Head title="Program Accounts" />
        <PageLayout title={`${props.program_name ?? ""} ACCOUNTS`.trim()}>
            <TabSwitcher tabs={tabs} value={activeTab} onChange={goToTab} />

            {/* Students: enrolled in that period. Faculty: registered in it. */}
            {activeTab !== "files" && <SchoolYearSemesterFilter schoolYears={props.school_years} />}

            {activeTab === "students" && <StudentList list={props.students} type="program_head" />}
            {activeTab === "faculty" && <FacultyList list={props.faculty} type="program_head" />}
            {activeTab === "files" && <AccountFilesTab files={props.account_files} canDelete={false} />}
        </PageLayout>
        </>
    )
}

ProgramAccountFiles.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default ProgramAccountFiles
