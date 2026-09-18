import Btn from "@/Components/button/normal-btn"
import TardyReportList from "@/Components/list/tardy-report-list"
import { FileText } from "lucide-react"

const TardyReport = (props) => {
    return (
        <>
        <div className="flex justify-end">
            <Btn onclick={() => props.openGenerateReport(true)}>
                <FileText size="1em" /> Create Filter
            </Btn>
        </div>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <TardyReportList list={props.report} events={props.events} />
            </div>
        </div>
        </>
    )
}

export default TardyReport
