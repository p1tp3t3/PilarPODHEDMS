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
                return <IncidentGroupList user_id={props.data.id} list={props.incidentGroups} />
            case 'occurence':
                return <RecentViolationOccurenceList user_id={props.data.id} list={props.violationOccurrences} />
        }
    }
    return (
        <>
        <div className="px-10 py-6 bg-white shadow shadow-black/20">
            <div className="grid gap-5">
                <div className="">
                    <TabSwitcher tabs={optionList} value={option} onChange={handleSelect} />
                </div>
                {renderContent()}
            </div>
        </div>
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
