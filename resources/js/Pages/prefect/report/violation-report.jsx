import { useState } from "react"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import IncidentReportList from "@/Components/list/incident-report-list"
import ViolationReportList from "@/Components/list/violation-report-list"

const ViolationReport = (props) => {
    return (
        <>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <ViolationReportList list={props.report} events={props.events} />
            </div>
        </div>
        </>
    )
}

export default ViolationReport
