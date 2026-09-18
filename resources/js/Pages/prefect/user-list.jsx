import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import DropdownField from "@/Components/input/dropdown"
import Btn from "@/Components/button/normal-btn"
import StudentList from "@/Components/list/student-list"
import StaffList from "@/Components/list/staff-list"
import ParentList from "@/Components/list/parent-list"
import ManagePositionsModal from "@/Components/modal/submission-form/manage-positions-modal"
import { useState } from "react"
import { router } from "@inertiajs/react"
import { GraduationCap, UserRoundCog, Users, Settings } from "lucide-react"

const userTabs = [
    { key: "student", label: "Student List", icon: GraduationCap },
    { key: "staff", label: "Staff List", icon: UserRoundCog },
    { key: "parent", label: "Parent List", icon: Users },
]

// 'faculty'/'program_head' live in the same shared positions table but are
// teaching_staff-only — never assigned to a non_teaching_staff account, so
// they'd never actually filter anything on this tab.
const TEACHING_ONLY_POSITIONS = ["faculty", "program_head"]

// Collapses what used to be three separate sidebar pages (Student List /
// Staff List / Parent List) into one page with tabs — each tab still hits
// the same backend data (AccountController::userListIndex reuses
// getStudent()/getStaffList()/getParentList() as-is) via a full reload that
// keeps `tab` (and, for staff, `type`/`program`/`position`) in the URL, the
// same pattern the original three pages already used for their own filters.
const PrefectUserList = (props) => {
    const params = new URLSearchParams(window.location.search)
    const tab = props.tab ?? "student"

    const updateQuery = (patch) => {
        const next = new URLSearchParams(window.location.search)
        Object.entries(patch).forEach(([key, value]) => {
            if (value) next.set(key, value)
            else next.delete(key)
        })
        router.visit(`/prefect/user-list?${next.toString()}`)
    }

    const handleTab = (nextTab) => {
        // Switching the top-level tab starts that tab fresh instead of
        // carrying over another tab's filters (program/type/position mean
        // different things — or nothing — depending on which tab they land on).
        router.visit(`/prefect/user-list?tab=${nextTab}`)
    }

    const staffType = params.get("type") ?? "teaching"
    const staffProgram = params.get("program") ?? ""
    const staffPosition = params.get("position") ?? ""
    const canManagePosition = props.user.role === "super_admin"
    const [positions, setPositions] = useState(props.positions ?? [])
    const [managePositionsModal, openManagePositionsModal] = useState(false)

    const studentProgram = params.get("program")
    const studentSchoolYear = params.get("school-year")
    const studentSemester = params.get("semester")

    const handleStudentFilter = (field, value) => {
        updateQuery({
            tab: "student",
            program: field === "program" ? value : (studentProgram || "all"),
            "school-year": field === "school-year" ? value : (studentSchoolYear || "all"),
            semester: field === "semester" ? value : (studentSemester || "all"),
        })
    }

    return (
        <>
            {canManagePosition && tab === "staff" && (
                <ManagePositionsModal
                    close={managePositionsModal}
                    closeModal={openManagePositionsModal}
                    positions={positions}
                    setPositions={setPositions}
                />
            )}
            <PageLayout
                title="USER LIST"
                rightSideComponent={canManagePosition && tab === "staff" &&
                    <Btn onclick={() => openManagePositionsModal(true)}>
                        <span className="flex items-center gap-2">
                            <Settings size={16} /> Manage Positions
                        </span>
                    </Btn>}
            >
                <TabSwitcher tabs={userTabs} value={tab} onChange={handleTab} />

                {tab === "student" &&
                <>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                default={{ val: "all", label: "All Programs" }}
                                list={props.program}
                                val={studentProgram}
                                onChange={(e) => handleStudentFilter("program", e.target.value)}
                            />
                        </div>
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                default={{ val: "all", label: "Select School Year" }}
                                list={(props.school_years || []).map((y) => ({ val: y, label: y }))}
                                val={studentSchoolYear}
                                onChange={(e) => handleStudentFilter("school-year", e.target.value)}
                            />
                        </div>
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                default={{ val: "all", label: "All Semesters" }}
                                list={[
                                    { val: 1, label: "1st Semester" },
                                    { val: 2, label: "2nd Semester" },
                                ]}
                                val={studentSemester}
                                onChange={(e) => handleStudentFilter("semester", e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full min-w-0">
                        <StudentList list={props.students} />
                    </div>
                </>}

                {tab === "staff" &&
                <>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                list={[
                                    { val: "all", label: "All Staff" },
                                    { val: "teaching", label: "Teaching Staff" },
                                    { val: "non_teaching", label: "Non-Teaching Staff" },
                                ]}
                                val={staffType}
                                onChange={(e) => updateQuery({ tab: "staff", type: e.target.value })}
                            />
                        </div>
                        {staffType === "teaching" && (
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "", label: "All Programs" }}
                                    list={(props.programs ?? []).map((p) => ({ val: p.id, label: p.name }))}
                                    onChange={(e) => updateQuery({ tab: "staff", type: staffType, program: e.target.value })}
                                    name="program"
                                    val={staffProgram}
                                />
                            </div>
                        )}
                        {staffType !== "teaching" && (
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "", label: "All Positions" }}
                                    list={(props.positions ?? [])
                                        .filter((p) => staffType === "all" || !TEACHING_ONLY_POSITIONS.includes(p.name))
                                        .map((p) => ({ val: p.id, label: p.name }))}
                                    onChange={(e) => updateQuery({ tab: "staff", type: staffType, position: e.target.value })}
                                    name="position"
                                    val={staffPosition}
                                />
                            </div>
                        )}
                    </div>
                    <StaffList
                        list={props.staff}
                        canManagePosition={canManagePosition}
                    />
                </>}

                {tab === "parent" &&
                <ParentList list={props.parents} />}
            </PageLayout>
        </>
    )
}

PrefectUserList.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectUserList
