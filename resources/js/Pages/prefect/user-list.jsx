import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import Btn from "@/Components/button/normal-btn"
import StudentList from "@/Components/list/student-list"
import StaffList from "@/Components/list/staff-list"
import ParentList from "@/Components/list/parent-list"
import ManagePositionsModal from "@/Components/modal/submission-form/manage-positions-modal"
import { useState } from "react"
import { router } from "@inertiajs/react"
import { GraduationCap, UserRoundCog, Users, Settings, X } from "lucide-react"
import { Head } from "@inertiajs/react"
import { PageActions } from "@/context-provider/page-title-provider"
import { getYearLevel } from "@/others/function"

const userTabs = [
    { key: "student", label: "Student List", icon: GraduationCap },
    { key: "staff", label: "Staff List", icon: UserRoundCog },
    { key: "parent", label: "Parent List", icon: Users },
]


// Collapses what used to be three separate sidebar pages (Student List /
// Staff List / Parent List) into one page with tabs — each tab still hits
// the same backend data (AccountController::userListIndex reuses
// getStudent()/getStaffList()/getParentList() as-is) via a full reload that
// keeps `tab` (and, for staff, `type`/`program`/`position`) in the URL, the
// same pattern the original three pages already used for their own filters.
const TEACHING_TYPES = ["program_head", "faculty", "teaching"]

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

    const staffType = params.get("type") ?? "all"
    const staffProgram = params.get("program") ?? ""
    const staffPosition = params.get("position") ?? ""
    const canManagePosition = props.auth.user.role === "super_admin"
    const [positions, setPositions] = useState(props.positions ?? [])
    const [managePositionsModal, openManagePositionsModal] = useState(false)

    const studentProgram = params.get("program")
    const studentYearLevel = params.get("year-level")
    const onlyEnrolled = ["1", "true"].includes(params.get("is-enrolled") ?? "")
    // Opens on the current school year / semester (the server does the
    // same), the dashboard's "Total Enrolled Students" link included.
    const currentSys = props.current_school_year_semester
    const onDefaultPeriod = !params.has("school-year") && !params.has("semester") && !!currentSys?.school_year?.year
    const studentSchoolYear = params.get("school-year") ?? (onDefaultPeriod ? currentSys.school_year.year : null)
    const studentSemester = params.get("semester") ?? (onDefaultPeriod ? String(currentSys.semester) : null)

    // Staff / Parent tabs: accounts registered in that school year / semester.
    const listSchoolYear = params.get("school-year") ?? "all"
    const listSemester = params.get("semester") ?? "all"
    const parentRole = params.get("parent-role") ?? "all"
    const periodDropdowns = (tabKey) => (
        <>
            <div className="w-full sm:w-[14rem] flex-shrink-0">
                <DropdownField
                    default={{ val: "all", label: "All School Years" }}
                    list={(props.school_years || []).map((y) => ({ val: y, label: y }))}
                    val={listSchoolYear}
                    onChange={(e) => updateQuery({ tab: tabKey, "school-year": e.target.value })}
                    name={`${tabKey}_school_year`}
                />
            </div>
            <div className="w-full sm:w-[14rem] flex-shrink-0">
                <DropdownField
                    default={{ val: "all", label: "All Semesters" }}
                    list={[
                        { val: 1, label: "1st Semester" },
                        { val: 2, label: "2nd Semester" },
                    ]}
                    val={listSemester === "all" ? "all" : Number(listSemester)}
                    onChange={(e) => updateQuery({ tab: tabKey, semester: e.target.value })}
                    name={`${tabKey}_semester`}
                />
            </div>
        </>
    )

    const handleStudentFilter = (field, value) => {
        updateQuery({
            tab: "student",
            program: field === "program" ? value : (studentProgram || "all"),
            "school-year": field === "school-year" ? value : (studentSchoolYear || "all"),
            semester: field === "semester" ? value : (studentSemester || "all"),
            "year-level": field === "year-level" ? value : (studentYearLevel || "all"),
        })
    }

    return (
        <>
            <Head title="User List" />
            {canManagePosition && tab === "staff" && (
                <ManagePositionsModal
                    close={managePositionsModal}
                    closeModal={openManagePositionsModal}
                    positions={positions}
                    setPositions={setPositions}
                />
            )}
            <PageLayout actionsWithFilters
                title="USER LIST"
                rightSideComponent={canManagePosition && tab === "staff" &&
                    <Btn onclick={() => openManagePositionsModal(true)} icon={<Settings size={19} />}>
                        <span className="flex items-center gap-2">
                            <Settings size={16} /> Manage Positions
                        </span>
                    </Btn>}
            >
                <TabSwitcher tabs={userTabs} value={tab} onChange={handleTab} />

                {tab === "student" &&
                <>
                    {onlyEnrolled && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[0.8em] text-blue-900">
                            <span>Showing currently enrolled students only (dropped students hidden)</span>
                            <button
                                type="button"
                                onClick={() => updateQuery({ "is-enrolled": "" })}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-100"
                            >
                                <X size={13} /> Show all students
                            </button>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                        <MobileFilters active={countActive(studentProgram, studentYearLevel, studentSchoolYear, studentSemester)}>
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
                                default={{ val: "all", label: "All Year Levels" }}
                                list={[1, 2, 3, 4].map((y) => ({ val: y, label: getYearLevel(y) }))}
                                val={studentYearLevel ? Number(studentYearLevel) || studentYearLevel : "all"}
                                onChange={(e) => handleStudentFilter("year-level", e.target.value)}
                                name="year_level_filter"
                                keepCase={true}
                            />
                        </div>
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                default={{ val: "all", label: "All School Years" }}
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
                                val={studentSemester && studentSemester !== "all" ? Number(studentSemester) : "all"}
                                onChange={(e) => handleStudentFilter("semester", e.target.value)}
                            />
                        </div>
                        </MobileFilters>
                    </div>
                    <div className="w-full min-w-0">
                        <StudentList list={props.students} />
                    </div>
                </>}

                {tab === "staff" &&
                <>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center md:max-lg:flex-row md:max-lg:flex-nowrap md:max-lg:items-center md:max-lg:[&>div:not(:last-child)]:flex-1 md:max-lg:[&>div:not(:last-child)]:min-w-0 md:max-lg:[&>div:not(:last-child)]:w-auto">
                        <MobileFilters active={countActive(staffType, staffProgram, staffPosition, listSchoolYear, listSemester)}>
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                list={[
                                    { val: "all", label: "All Staff" },
                                    { val: "program_head", label: "Program Heads" },
                                    { val: "faculty", label: "Faculty" },
                                    { val: "non_teaching", label: "Non-Teaching Staff" },
                                ]}
                                val={staffType}
                                onChange={(e) => updateQuery({ tab: "staff", type: e.target.value })}
                            />
                        </div>
                        {TEACHING_TYPES.includes(staffType) && (
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
                        {!TEACHING_TYPES.includes(staffType) && (
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "", label: "All Positions" }}
                                    list={(props.positions ?? [])
                                        .map((p) => ({ val: p.id, label: p.name }))}
                                    onChange={(e) => updateQuery({ tab: "staff", type: staffType, position: e.target.value })}
                                    name="position"
                                    val={staffPosition}
                                />
                            </div>
                        )}
                        {periodDropdowns("staff")}
                        </MobileFilters>
                        <PageActions />
                    </div>
                    <StaffList
                        list={props.staff}
                        canManagePosition={canManagePosition}
                    />
                </>}

                {tab === "parent" &&
                <>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                        <MobileFilters active={countActive(parentRole, listSchoolYear, listSemester)}>
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "all", label: "All Parent Roles" }}
                                    list={[
                                        { val: "father", label: "Father" },
                                        { val: "mother", label: "Mother" },
                                        { val: "guardian", label: "Guardian" },
                                    ]}
                                    val={parentRole}
                                    onChange={(e) => updateQuery({ tab: "parent", "parent-role": e.target.value })}
                                    name="parent_role_filter"
                                    keepCase={true}
                                />
                            </div>
                            {periodDropdowns("parent")}
                        </MobileFilters>
                    </div>
                    <ParentList list={props.parents} />
                </>}
            </PageLayout>
        </>
    )
}

PrefectUserList.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectUserList
