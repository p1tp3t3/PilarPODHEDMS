import LineGraph from "@/Components/card/line-graph-statistic"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import TabSwitcher from "@/Components/other/tab-switcher"
import { useState, useEffect } from "react"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { getWebLink, splitStr, toTitleCase } from "@/others/function"
import DoughnutChart from "@/Components/card/pie-chart-statistic-card"
import GaugeChart from "@/Components/card/gauge-chart-statistic-card"
import DropdownField from "@/Components/input/dropdown"
import IncidentList from "@/Components/list/incident-list"
import PossibleIncidentList from "@/Components/list/possible-incident-commit-list"
import { data } from "autoprefixer"
import RecentViolationOccurenceList from "@/Components/list/recent-violation-occurence-list"
import IncidentGroupList from "@/Components/list/incident-group-list"
import { Paper, Stack } from "@mui/material"

const Incident = (props) => {
    const [option, setOption] = useState('recent_incidents')

    const optionList = [
        { key: 'recent_incidents', label: 'Recent Incidents' },
        { key: 'occurence', label: 'Occurences' },
    ]
    const handleSelect = (type) => {
        setOption(type)
    }

    const renderContent = () => {
        switch (option) {
            case 'recent_incidents':
                return <IncidentGroupList user_id={props.data.encrypted_id} list={props.incidentGroups} />
            case 'occurence':
                return <RecentViolationOccurenceList user_id={props.data.encrypted_id} list={props.violationOccurrences} />
        }
    }
    return (
        <>
        <Paper elevation={2} sx={{ px: { xs: 2, sm: 5 }, py: 3, borderRadius: 1 }}>
            <Stack spacing={2.5}>
                <TabSwitcher tabs={optionList} value={option} onChange={handleSelect} />
                {renderContent()}
            </Stack>
        </Paper>
        </>
    )
}



const RecentIncident = ({ link, option, setIncident, list }) => {
    useEffect(() => {
        setIncident(null)
        ReportArchiveService.getIncidentList(link, setIncident)
    }, [option])

    return (
        <div className="w-full">
            <IncidentList list={list} isIncident={link.includes('incident')} />
        </div>
    )
}
export default Incident
