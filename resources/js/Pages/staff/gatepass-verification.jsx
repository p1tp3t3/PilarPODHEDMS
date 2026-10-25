import GatePassApprovedList from "@/Components/list/gatepass-approved-list"
import DropdownField from "@/Components/input/dropdown"
import AuthLayout from "@/Layouts/auth-layout"
import { GatePassService } from "@/others/services/gatepass-service"
import { useState, useEffect, useMemo } from "react"
import { Chip } from "@mui/material"
import { RefreshCw } from "lucide-react"
import PageLayout from "@/Layouts/page-layout"
import { PageActions } from "@/context-provider/page-title-provider"
import Btn from "@/Components/button/normal-btn"
import { Head } from "@inertiajs/react"

const StaffGatePassVerification = (props) => {
    const [gatepassApprovedList, setGatePassApprovedList] = useState(null),
            [programFilter, setProgramFilter] = useState('all')

    useEffect(() => {
        fetchApprovedUsers()

        // Real-time: refresh the moment the prefect approves any gate pass,
        // instead of the Guard needing to hit the refresh button themselves.
        window.Echo.private('gate-pass-approvals').listen('GatePassApproved', () => {
            fetchApprovedUsers()
        })

        return () => window.Echo.leaveChannel('gate-pass-approvals')
    }, [])

    const fetchApprovedUsers = () => {
        setGatePassApprovedList(null)
        setProgramFilter('all')
        // A bad reply shows an empty list instead of breaking the page.
        GatePassService.getApprovedUsers((d) => setGatePassApprovedList(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : [])))
    }

    // Filter is built from whatever's already loaded — no extra request,
    // just narrows the list client-side by name and/or the approved user's
    // program.
    const programOptions = useMemo(() => {
        if (!gatepassApprovedList) return []
        const seen = new Map()
        gatepassApprovedList.forEach((e) => {
            if (e.program?.id != null && !seen.has(e.program.id)) {
                seen.set(e.program.id, e.program.name)
            }
        })
        return Array.from(seen, ([val, label]) => ({ val, label }))
    }, [gatepassApprovedList])

    const filteredList = useMemo(() => {
        if (!gatepassApprovedList) return null

        return gatepassApprovedList.filter((e) => {
            const matchesProgram = programFilter === 'all' || e.program?.id === programFilter
            return matchesProgram
        })
    }, [gatepassApprovedList, programFilter])

    return (
        <>
        <Head title="Gate Pass Verification" />
        <PageLayout actionsWithFilters
            title="GATE PASS VERIFICATION"
            rightSideComponent={
                <Btn onclick={() => fetchApprovedUsers()} icon={<RefreshCw size={18} className={gatepassApprovedList === null ? "animate-spin" : ""} />}>
                    Refresh
                </Btn>
            }
        >
            {/* Program filter, with Refresh beside it on tablet/desktop. */}
            <div className="flex flex-wrap items-center gap-3">
                {programOptions.length > 0 && (
                    <div className="w-full sm:w-56">
                        <DropdownField
                            default={{ val: 'all', label: 'All Programs' }}
                            list={programOptions}
                            val={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                            name="program_filter"
                        />
                    </div>
                )}
                <PageActions />
            </div>

            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3 min-w-0">
                <div className="flex items-center gap-2 pb-2">
                    <span className="font-semibold text-gray-800 text-[0.95em]">Approved Gate Passes</span>
                    {filteredList != null && <Chip size="small" label={`${filteredList.length} active`} />}
                </div>
                <GatePassApprovedList list={filteredList} />
            </div>
        </PageLayout>
        </>
    )
}

StaffGatePassVerification.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default StaffGatePassVerification
