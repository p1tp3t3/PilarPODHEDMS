import AuthLayout from "@/Layouts/auth-layout"
import ManageDatasetModel from "./maintenance/manage-dataset-model"
import { Head } from "@inertiajs/react"

// System Administrator > Model Training: status and training of the two
// AI models on the Python ML service.
const ModelTraining = () => (
    <>
        <Head title="Model Training" />
        <ManageDatasetModel />
    </>
)

ModelTraining.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ModelTraining
