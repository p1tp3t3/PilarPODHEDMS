import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState } from "react"
import { router } from "@inertiajs/react"
import StaffList from "@/Components/list/staff-list"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import ManagePositionsModal from "@/Components/modal/submission-form/manage-positions-modal"
import Btn from "@/Components/button/normal-btn"
import { Settings } from "lucide-react"
import { Head } from "@inertiajs/react"
import { PageActions } from "@/context-provider/page-title-provider"


const TEACHING_TYPES = ["program_head", "faculty", "teaching"]

const PrefectStaffList = (props) => {
    const url = new URLSearchParams(window.location.search)
    const [tab, setTab] = useState(url.get("type") ?? "all")
    const [program, setProgram] = useState(url.get("program") ?? "")
    const [positionFilter, setPositionFilter] = useState(url.get("position") ?? "")
    // Staff accounts registered in that school year / semester.
    const schoolYear = url.get("school-year") ?? "all"
    const semester = url.get("semester") ?? "all"
    // Position management (assign/reassign one of the 8 fixed non-teaching
    // positions) is a super_admin-only capability server-side
    // (routes/auth.php's /super-admin/staff/position/* group) — this page
    // is shared with the prefect's own staff list, so the action is only
    // shown/wired up when the viewer is actually super_admin.
    const canManagePosition = props.auth.user.role === "super_admin"
    const [positions, setPositions] = useState(props.positions ?? [])
    const [managePositionsModal, openManagePositionsModal] = useState(false)

    // Preserves the other active filter when only one changes — switching
    // tabs shouldn't silently drop the program filter and vice versa. Uses
    // the current path rather than a hardcoded one since this same page is
    // reachable at both /prefect/staff-list and /super-admin/staff-list.
    const updateQuery = (patch) => {
        const params = new URLSearchParams(window.location.search)
        Object.entries(patch).forEach(([key, value]) => {
            if (value) params.set(key, value)
            else params.delete(key)
        })
        router.visit(`${window.location.pathname}?${params.toString()}`)
    }

    const handleTab = (type) => {
        setTab(type)
        updateQuery({ type })
    }

    const handleProgramChange = (e) => {
        const value = e.target.value
        setProgram(value)
        updateQuery({ program: value })
    }

    const handlePositionFilterChange = (e) => {
        const value = e.target.value
        setPositionFilter(value)
        updateQuery({ position: value })
    }

    return (
        <>
            <Head title="Staff List" />
            {canManagePosition && (
                <ManagePositionsModal
                    close={managePositionsModal}
                    closeModal={openManagePositionsModal}
                    positions={positions}
                    setPositions={setPositions}
                />
            )}
            <PageLayout actionsWithFilters
                title="STAFF LIST"
                rightSideComponent={canManagePosition &&
                    <Btn onclick={() => openManagePositionsModal(true)} icon={<Settings size={19} />}>
                        <span className="flex items-center gap-2">
                            <Settings size={16} /> Manage Positions
                        </span>
                    </Btn>}
            >
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center md:max-lg:flex-row md:max-lg:flex-nowrap md:max-lg:items-center md:max-lg:[&>div:not(:last-child)]:flex-1 md:max-lg:[&>div:not(:last-child)]:min-w-0 md:max-lg:[&>div:not(:last-child)]:w-auto">
                        <MobileFilters active={countActive(tab, program, positionFilter, schoolYear, semester)}>
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                list={[
                                    { val: "all", label: "All Staff" },
                                    { val: "program_head", label: "Program Heads" },
                                    { val: "faculty", label: "Faculty" },
                                    { val: "non_teaching", label: "Non-Teaching Staff" },
                                ]}
                                val={tab}
                                onChange={(e) => handleTab(e.target.value)}
                            />
                        </div>
                        {TEACHING_TYPES.includes(tab) && (
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "", label: "All Programs" }}
                                    list={(props.programs ?? []).map((p) => ({ val: p.id, label: p.code }))}
                                    onChange={handleProgramChange}
                                    name="program"
                                    val={program}
                                />
                            </div>
                        )}
                        {!TEACHING_TYPES.includes(tab) && (
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "", label: "All Positions" }}
                                    list={positions
                                        .map((p) => ({ val: p.id, label: p.name }))}
                                    onChange={handlePositionFilterChange}
                                    name="position"
                                    val={positionFilter}
                                />
                            </div>
                        )}
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                default={{ val: "all", label: "All School Years" }}
                                list={(props.school_years ?? []).map((y) => ({ val: y, label: y }))}
                                val={schoolYear}
                                onChange={(e) => updateQuery({ "school-year": e.target.value })}
                                name="school_year"
                            />
                        </div>
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                default={{ val: "all", label: "All Semesters" }}
                                list={[
                                    { val: 1, label: "1st Semester" },
                                    { val: 2, label: "2nd Semester" },
                                ]}
                                val={semester === "all" ? "all" : Number(semester)}
                                onChange={(e) => updateQuery({ semester: e.target.value })}
                                name="semester"
                            />
                        </div>
                        </MobileFilters>
                        <PageActions />
                    </div>

                    <StaffList
                        list={props.staff}
                        canManagePosition={canManagePosition}
                    />
            </PageLayout>
        </>
    )
}

PrefectStaffList.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectStaffList
