import TardyReportList from "@/Components/list/tardy-report-list"

const TardyReport = (props) => {
    return (
        <>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <TardyReportList list={props.report} events={props.events} />
            </div>
        </div>
        </>
    )
}

export default TardyReport
