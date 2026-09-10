import AuthLayout from "@/Layouts/auth-layout"
import { useState } from "react"
import { router } from "@inertiajs/react"
import StaffList from "@/Components/list/staff-list"
import TabSwitcher from "@/Components/other/tab-switcher"
import DropdownField from "@/Components/input/dropdown"
import { UserRoundCog, Users } from "lucide-react"

const optionTab = [
    { key: "teaching", label: "Teaching Staff", icon: UserRoundCog },
    { key: "non_teaching", label: "Non-Teaching Staff", icon: Users },
]

const PrefectStaffList = (props) => {
    const url = new URLSearchParams(window.location.search)
    const [tab, setTab] = useState(url.get("type") ?? "teaching")
    const [program, setProgram] = useState(url.get("program") ?? "")

    // Preserves the other active filter when only one changes — switching
    // tabs shouldn't silently drop the program filter and vice versa.
    const updateQuery = (patch) => {
        const params = new URLSearchParams(window.location.search)
        Object.entries(patch).forEach(([key, value]) => {
            if (value) params.set(key, value)
            else params.delete(key)
        })
        router.visit(`/prefect/staff-list?${params.toString()}`)
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

    return (
        <>
            <div className="w-full py-4">
                <div className="w-full grid gap-5 relative">
                    <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                        <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">STAFF LIST</h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="w-full overflow-x-auto">
                            <TabSwitcher tabs={optionTab} value={tab} onChange={handleTab} />
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
                    </div>

                    <StaffList list={props.staff} />
                </div>
            </div>
        </>
    )
}

PrefectStaffList.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectStaffList
