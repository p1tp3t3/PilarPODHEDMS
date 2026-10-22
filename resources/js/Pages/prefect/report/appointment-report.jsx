import AppointmentReportList from "@/Components/list/appointment-report-list"

const AppointmentReport = (props) => {
    return (
        <>
        <div className="grid gap-3">
            <div className="w-full scroll-smooth">
                <AppointmentReportList list={props.report} />
            </div>
        </div>
        </>
    )
}

export default AppointmentReport
