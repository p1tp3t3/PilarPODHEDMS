import { useState } from "react"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import Btn from "@/Components/button/normal-btn"
import IncidentReportList from "@/Components/list/incident-report-list"
import { FileText } from "lucide-react"

const IncidentReport = (props) => {
    const barData = {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
            {
                label: "Incidents",
                data: [12, 19, 8, 15],
                backgroundColor: ["#3b82f6", "#22c55e", "#facc15", "#ef4444"],
            },
        ],
    }

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { display: true, position: "top" },
        },
    }

    const topIncidents = [
        { category: "Bullying", count: 12 },
        { category: "Cheating", count: 8 },
        { category: "Vandalism", count: 6 },
    ]
    return (
        <>
        <div className="flex justify-end">
            <Btn onclick={() => props.openGenerateReport(true)}>
                <FileText size={16} /> Create Filter
            </Btn>
        </div>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <IncidentReportList list={props.report} events={props.events} />
            </div>
        </div>
        </>
    )
}

export default IncidentReport