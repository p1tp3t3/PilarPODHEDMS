import Btn from "@/Components/button/normal-btn"
import AppointmentReportList from "@/Components/list/appointment-report-list"
import { FileText } from "lucide-react"

const AppointmentReport = (props) => {
    return (
        <>
        <div className="flex justify-end">
            <Btn onclick={() => props.openGenerateReport(true)}>
                <FileText size="1em" /> Create Filter
            </Btn>
        </div>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <AppointmentReportList list={props.report} />
            </div>
        </div>
        </>
    )
}

export default AppointmentReport
