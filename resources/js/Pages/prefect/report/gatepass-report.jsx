import Btn from "@/Components/button/normal-btn"
import GatePassReportList from "@/Components/list/gatepass-report-list"
import { FileText } from "lucide-react"

const GatePassReport = (props) => {
    return (
        <>
        <div className="flex justify-end">
            <Btn onclick={() => props.openGenerateReport(true)}>
                <FileText size="1em" /> Create Filter
            </Btn>
        </div>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <GatePassReportList list={props.report} />
            </div>
        </div>
        </>
    )
}

export default GatePassReport
