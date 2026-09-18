import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState } from "react"
import { router } from "@inertiajs/react"
import StaffList from "@/Components/list/staff-list"
import DropdownField from "@/Components/input/dropdown"
import ManagePositionsModal from "@/Components/modal/submission-form/manage-positions-modal"
import Btn from "@/Components/button/normal-btn"
import { Settings } from "lucide-react"

// 'faculty'/'program_head' live in the same shared positions table but are
// teaching_staff-only — never assigned to a non_teaching_staff account, so
// they'd never actually filter anything on this tab.
const TEACHING_ONLY_POSITIONS = ["faculty", "program_head"]

const PrefectStaffList = (props) => {
    const url = new URLSearchParams(window.location.search)
    const [tab, setTab] = useState(url.get("type") ?? "teaching")
    const [program, setProgram] = useState(url.get("program") ?? "")
    const [positionFilter, setPositionFilter] = useState(url.get("position") ?? "")
    // Position management (assign/reassign one of the 8 fixed non-teaching
    // positions) is a super_admin-only capability server-side
    // (routes/auth.php's /super-admin/staff/position/* group) — this page
    // is shared with the prefect's own staff list, so the action is only
    // shown/wired up when the viewer is actually super_admin.
    const canManagePosition = props.user.role === "super_admin"
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
            {canManagePosition && (
                <ManagePositionsModal
                    close={managePositionsModal}
                    closeModal={openManagePositionsModal}
                    positions={positions}
                    setPositions={setPositions}
                />
            )}
            <PageLayout
                title="STAFF LIST"
                rightSideComponent={canManagePosition &&
                    <Btn onclick={() => openManagePositionsModal(true)}>
                        <span className="flex items-center gap-2">
                            <Settings size={16} /> Manage Positions
                        </span>
                    </Btn>}
            >
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="w-full sm:w-[14rem] flex-shrink-0">
                            <DropdownField
                                list={[
                                    { val: "all", label: "All Staff" },
                                    { val: "teaching", label: "Teaching Staff" },
                                    { val: "non_teaching", label: "Non-Teaching Staff" },
                                ]}
                                val={tab}
                                onChange={(e) => handleTab(e.target.value)}
                            />
                        </div>
                        {tab === "teaching" && (
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "", label: "All Programs" }}
                                    list={(props.programs ?? []).map((p) => ({ val: p.id, label: p.name }))}
                                    onChange={handleProgramChange}
                                    name="program"
                                    val={program}
                                />
                            </div>
                        )}
                        {tab !== "teaching" && (
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: "", label: "All Positions" }}
                                    list={positions
                                        .filter((p) => tab === "all" || !TEACHING_ONLY_POSITIONS.includes(p.name))
                                        .map((p) => ({ val: p.id, label: p.name }))}
                                    onChange={handlePositionFilterChange}
                                    name="position"
                                    val={positionFilter}
                                />
                            </div>
                        )}
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
