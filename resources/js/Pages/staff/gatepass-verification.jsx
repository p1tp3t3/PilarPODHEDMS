import GatePassApprovedList from "@/Components/list/gatepass-approved-list"
import SearchBar from "@/Components/input/search-bar"
import DropdownField from "@/Components/input/dropdown"
import AuthLayout from "@/Layouts/auth-layout"
import { GatePassService } from "@/others/services/gatepass-service"
import { useState, useEffect, useMemo } from "react"
import { Paper, IconButton, Tooltip, Typography, Chip } from "@mui/material"
import { RefreshCw, ShieldCheck } from "lucide-react"

const StaffGatePassVerification = (props) => {
    const [gatepassApprovedList, setGatePassApprovedList] = useState(null),
            [search, setSearch] = useState(''),
            [programFilter, setProgramFilter] = useState('all')

    useEffect(() => {
        fetchApprovedUsers()

        // Real-time: refresh the moment the prefect approves any gate pass,
        // instead of the Guard needing to hit the refresh button themselves.
        window.Echo.channel('gate-pass-approvals').listen('GatePassApproved', () => {
            fetchApprovedUsers()
        })

        return () => window.Echo.leaveChannel('gate-pass-approvals')
    }, [])

    const fetchApprovedUsers = () => {
        setGatePassApprovedList(null)
        setSearch('')
        setProgramFilter('all')
        GatePassService.getApprovedUsers(setGatePassApprovedList)
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
        const term = search.trim().toLowerCase()

        return gatepassApprovedList.filter((e) => {
            const matchesProgram = programFilter === 'all' || e.program?.id === programFilter
            const fullName = `${e.profile?.first_name ?? ''} ${e.profile?.last_name ?? ''}`.toLowerCase()
            const matchesSearch = term === '' || fullName.includes(term)
            return matchesProgram && matchesSearch
        })
    }, [gatepassApprovedList, programFilter, search])

    return (
        <div className="w-full py-4 grid gap-5">
            <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                <div>
                    <Typography variant="h5" fontWeight={700} className="flex items-center gap-2">
                        <ShieldCheck className="text-blue-600" size="0.9em" />
                        Gate Pass Verification
                    </Typography>
                </div>
                <Tooltip title="Refresh list">
                    <IconButton
                        onClick={() => fetchApprovedUsers()}
                        sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
                    >
                        <RefreshCw size="1.1em" className={gatepassApprovedList === null ? "animate-spin" : ""} />
                    </IconButton>
                </Tooltip>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <SearchBar
                    name="search_approved_user"
                    search={search}
                    setSearch={setSearch}
                    handleSearch={(e) => setSearch(e.target.value)}
                    plc="Search Gate Pass Approved User"
                />
                {programOptions.length > 0 && (
                    <div className="w-full sm:w-56 flex-shrink-0">
                        <DropdownField
                            default={{ val: 'all', label: 'All Programs' }}
                            list={programOptions}
                            val={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                            name="program_filter"
                        />
                    </div>
                )}
            </div>

            <Paper variant="outlined" sx={{ borderRadius: "0.75rem", overflow: "hidden" }}>
                <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3">
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                        Recently Approved
                    </Typography>
                    {filteredList != null && (
                        <Chip size="small" label={`${filteredList.length} approved`} />
                    )}
                </div>
                <GatePassApprovedList list={filteredList} />
            </Paper>
        </div>
    )
}

StaffGatePassVerification.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default StaffGatePassVerification
