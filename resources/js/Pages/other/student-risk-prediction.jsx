import ViewStudentIncidentListModal from "@/Components/modal/view/view-student-incident-list-modal"
import CircleReload from "@/Components/reload/circle-reload"
import { useEffect, useState } from "react"
import { RiskPredictionService } from "@/others/services/risk-prediction-service"
import { useReload } from "@/context-provider/reload-provider"
import AuthLayout from "@/Layouts/auth-layout"
import { AlertCircle } from "lucide-react"

const StudentRiskPrediction = (props) => {
    const [data, setData] = useState(null)

    useEffect(() => {
        RiskPredictionService.getStudentIncidentList(props.student.id, setData)
    }, [])

    const { loadRegister } = useReload();

    return (
        <>
            <div className="py-8">
                <div className="py-8 px-10 bg-white">
                    {data != null
                    ?
                    (data != '')
                    ?
                    <ViewStudentIncidentListModal.Body data={data} usr={props.student} reload={loadRegister} type={props.user.user_type} />
                    :
                    <div className="text-[1.2em] text-gray-500 w-full grid place-items-center h-full">
                        <div className="grid place-items-center">
                            <div className="text-[4em] grid place-items-center">
                                <AlertCircle size="1em" />
                            </div>
                            <h1 className="text-[1.2em]">No Student Found</h1>
                        </div>
                    </div>
                    :
                    <CircleReload size={5} />}
                </div>
            </div>
        </>
    )
}

StudentRiskPrediction.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default StudentRiskPrediction