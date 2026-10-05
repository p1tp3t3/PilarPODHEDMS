import AuthLayout from "@/Layouts/auth-layout"
import { Head, Link, router } from "@inertiajs/react"
import { getProgramLogo, getProfilePic } from "@/others/function"
import StudentList from "@/Components/list/student-list"
import FacultyList from "@/Components/list/faculty-list"
import ProfilePic from "@/Components/other/profile-pic"
import TabSwitcher from "@/Components/other/tab-switcher"

const tabs = [
    { key: "faculty", label: "Faculty" },
    { key: "students", label: "Students" },
]

const ProgramUsers = ({ program, faculty, students }) => {
    const head = program.program_head
    const activeTab = new URLSearchParams(window.location.search).get("tab") || "faculty"
    const goToTab = (tab) => router.visit(`/super-admin/program/${program.encrypted_id}/users?tab=${tab}`)

    return (
        <>
        <Head title={`${program.name} Users`} />
        <div className="w-full py-10 grid gap-8">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <img
                        src={getProgramLogo(program.logo)}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover"
                    />
                    <div>
                        <h1 className="text-[1.4em] font-bold leading-tight">{program.name}</h1>
                        <p className="text-gray-500 text-[0.9em]">{program.description}</p>
                    </div>
                </div>
                <Link
                    href="/super-admin/program"
                    className="text-[0.85em] text-gray-600 hover:text-gray-900"
                >
                    <i className="fa-solid fa-arrow-left"></i> Back to Programs
                </Link>
            </div>

            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-4">
                <h2 className="text-[1.1em] font-bold mb-3">Program Head</h2>
                {head ? (
                    <div className="flex items-center gap-3">
                        <ProfilePic
                            size={2.6}
                            src={getProfilePic(head.user?.profile?.profile_picture, head.user?.profile?.sex)}
                        />
                        <div>
                            <p className="text-[0.95em] font-semibold">
                                {head.user?.profile?.first_name} {head.user?.profile?.last_name}
                            </p>
                            <p className="text-[0.75em] text-gray-500">@{head.user?.username}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-[0.85em] text-gray-500">No program head assigned.</p>
                )}
            </div>

            <div>
                <TabSwitcher tabs={tabs} value={activeTab} onChange={goToTab} />

                {activeTab === "faculty" && (
                    <div className="pt-3">
                        <FacultyList list={faculty} paginate={false} type="itrc" />
                    </div>
                )}

                {activeTab === "students" && (
                    <div className="pt-3">
                        <StudentList list={students} paginate={false} type="itrc" />
                    </div>
                )}
            </div>

        </div>
        </>
    )
}

ProgramUsers.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ProgramUsers
