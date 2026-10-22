import GatePassReportList from "@/Components/list/gatepass-report-list"

const GatePassReport = (props) => {
    return (
        <>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <GatePassReportList list={props.report} />
            </div>
        </div>
        </>
    )
}

export default GatePassReport
