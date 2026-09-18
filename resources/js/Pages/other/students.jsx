import Btn from "@/Components/button/normal-btn"
import StudentList from "@/Components/list/student-list"
import AuthLayout from "@/Layouts/auth-layout"
import EditEnrollmentModal from "@/Components/modal/submission-form/edit-enrollment-modal"
import CsvStudentPreviewPage from "@/Components/other/csv-student-preview-page"
import CsvStudentProgressModal from "@/Components/modal/view/csv-student-progress-modal"
import UploadGuidelines from "@/Components/other/upload-guidelines"
import TabSwitcher from "@/Components/other/tab-switcher"
import CheckBoxButton from "@/Components/input/checkbox"
import { useReload } from "@/context-provider/reload-provider"
import { AccountService } from "@/others/services/account-service"
import { showOutputModal } from "@/others/function"
import { Head } from "@inertiajs/react"
import { useState, useRef } from "react"

const enrollmentCsvColumns = [
    { field: "student_id", headerName: "ID", width: 110 },
    { field: "program", headerName: "Program", width: 150 },
    { field: "year_level", headerName: "Year Level", width: 110 },
    { field: "enrolled_at", headerName: "Enrolled Since", width: 140 },
]

const Students = (props) => {
    const fileName = props.file_name
    const isSuperAdmin = props.user?.role === "super_admin"
    const { loadRegister } = useReload()

    const [activeTab, setActiveTab] = useState("list")
    const [agreedGuidelines, setAgreedGuidelines] = useState(false)

    const [editEnrollment, openEditEnrollment] = useState(false)
    const [enrollmentTarget, setEnrollmentTarget] = useState(null)

    const fileInputRef = useRef(null)
    const [csvPreview, openCsvPreview] = useState(false)
    const [csvPreviewRows, setCsvPreviewRows] = useState([])
    const [csvProgress, openCsvProgress] = useState(false)
    const [csvBatchId, setCsvBatchId] = useState(null)
    const [csvBatchTotal, setCsvBatchTotal] = useState(0)

    const handleEditEnrollment = (user) => {
        setEnrollmentTarget(user)
        openEditEnrollment(true)
    }

    const handleCsvFileChange = (e) => {
        const file = e.target.files[0]
        e.target.value = "" // allow re-selecting the same file after a cancel/error
        if (!file) return

        const isCSV = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")
        if (!isCSV) {
            showOutputModal("Invalid file type. Please upload a CSV file.", "e", () => {})
            return
        }

        loadRegister(true, "text-wait", "Parsing CSV File")
        const data = new FormData()
        data.append("file", file)
        AccountService.previewEnrollmentUpdateCsv(
            data,
            (res) => setCsvPreviewRows(res.rows),
            () => {
                loadRegister(false)
                openCsvPreview(true)
            },
            (err) => {
                loadRegister(true, "")
                showOutputModal(`Error Parsing CSV File. ${err.response?.data?.message ?? ""}`, "e", () => loadRegister(false))
            }
        )
    }

    const cancelCsvPreview = () => {
        setCsvPreviewRows([])
        openCsvPreview(false)
    }

    const finalizeEnrollmentCsv = () => {
        setCsvBatchTotal(csvPreviewRows.length)
        openCsvPreview(false)
        loadRegister(true, "text-wait", "Starting Enrollment Update")
        AccountService.commitEnrollmentUpdateCsv(
            csvPreviewRows.map((r) => r.data),
            (res) => setCsvBatchId(res.batch_id),
            () => {
                loadRegister(false)
                openCsvProgress(true)
            },
            (err) => {
                loadRegister(true, "")
                showOutputModal(`Error Starting Enrollment Update. ${err.response?.data?.message ?? ""}`, "e", () => loadRegister(false))
            }
        )
    }

    const closeCsvProgress = () => {
        openCsvProgress(false)
        setCsvPreviewRows([])
        setCsvBatchId(null)
        setCsvBatchTotal(0)
    }

    if (csvPreview) {
        return (
            <CsvStudentPreviewPage
                rows={csvPreviewRows}
                onCancel={cancelCsvPreview}
                onFinalize={finalizeEnrollmentCsv}
                onRowsChange={setCsvPreviewRows}
                onValidateRow={(row, onResult, onError) =>
                    AccountService.validateEnrollmentUpdateCsvRow(row, onResult, () => {}, onError)
                }
                title="Review Enrollment Update CSV"
                finalizeLabel="Finalize & Update"
                finalizeSuffix="Record(s)"
                columns={enrollmentCsvColumns}
                programOptions={(props.program ?? []).map((p) => p.name)}
            />
        )
    }

    return (
        <>
        <Head title="Student List" />
        <EditEnrollmentModal
            close={editEnrollment}
            closeModal={openEditEnrollment}
            data={enrollmentTarget}
            program={props.program}
            schoolYears={props.school_years_full}
            reload={loadRegister}
        />
        <CsvStudentProgressModal
            close={csvProgress}
            closeModal={openCsvProgress}
            batchId={csvBatchId}
            total={csvBatchTotal}
            userId={props.user?.id}
            onDone={closeCsvProgress}
        />
        <div className="w-full py-10">
            <div className="w-full grid gap-6 relative">
                <div className="flex justify-between items-center">
                    <h1 className="text-[1.4em]">
                        <b>Manage Students</b>
                    </h1>
                </div>

                {isSuperAdmin ? (
                    <TabSwitcher
                        tabs={[
                            { key: "list", label: "Student List" },
                            { key: "upload", label: "Update Student Enrollment" },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                    />
                ) : null}

                {activeTab === "list" && (
                    <div className="grid gap-6">
                        {props.user.user_type == 'administrative' &&
                        <div className="flex justify-end">
                            <a href={`/download/user/account/${fileName}`} download={fileName}>
                                <Btn>
                                    <i className="fa-solid fa-download"></i> Download Student Accounts
                                </Btn>
                            </a>
                        </div>}
                        <StudentList
                            list={props.students}
                            canEditEnrollment={isSuperAdmin}
                            onEditEnrollment={handleEditEnrollment}
                        />
                    </div>
                )}

                {activeTab === "upload" && isSuperAdmin && (
                    <div className="grid gap-5">
                        <UploadGuidelines type="enrollment_update" program={props.program} />

                        <CheckBoxButton.CheckBox
                            id="agreed-guidelines"
                            name="agreed_guidelines"
                            label="I have read and understood the guidelines above."
                            checked={agreedGuidelines}
                            change={(e) => setAgreedGuidelines(e.target.checked)}
                        />

                        {agreedGuidelines && (
                            <div>
                                <Btn onclick={() => fileInputRef.current?.click()}>
                                    <i className="fa-solid fa-upload"></i> Upload Enrollment Update CSV File
                                </Btn>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    hidden
                                    onChange={handleCsvFileChange}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        </>
    )
}

Students.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default Students
