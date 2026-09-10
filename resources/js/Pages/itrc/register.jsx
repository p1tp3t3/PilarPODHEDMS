import AuthLayout from "@/Layouts/auth-layout";
import "../style.css";
import { useState, useRef, useEffect } from "react";
import { useReload } from "@/context-provider/reload-provider";
import { RegisterService } from "@/others/services/register-service";
import logo from '../../images/pilar.png'
import RegistrationForm from "./register/main-form";
import NormalValidationModal from "@/Components/modal/validation/normal-validation-modal";
import { UserPlus } from "lucide-react";
import { showOutputModal, showWarningModal, toTitleCase } from "@/others/function";
import CsvStudentPreviewPage from "@/Components/other/csv-student-preview-page";
import CsvStudentProgressModal from "@/Components/modal/view/csv-student-progress-modal";

const Register = (props) => {
    const { loadRegister } = useReload();
    const [userListCSV, openUserListCSV] = useState(false),
          [csvFile, setCSVFile] = useState(null),
          [csvRowCount, setCSVRowCount] = useState(0),
          [errorFileText, setErrorFileText] = useState(''),
          [validationLabel, setValidationLabel] = useState(''),
          
          [type, setUserType] = useState(''),
          [validationError, setValidationError] = useState({
               file: '',
               first_name: '',
               middle_name: '',
               last_name: '',
               user_id: '',
               username: '',
               password: '',
               confirm_password: ''
          }),
          [csvColumn, setCSVColumn] = useState(''),

          [csvPreview, openCsvPreview] = useState(false),
          [csvPreviewRows, setCsvPreviewRows] = useState([]),
          [csvProgress, openCsvProgress] = useState(false),
          [csvBatchId, setCsvBatchId] = useState(null),
          [csvBatchTotal, setCsvBatchTotal] = useState(0),
          [uploadingCSV, setUploadingCSV] = useState(false);

    const [activate, activateAccount] = useState(false);

    useEffect(() => {
        const staged = sessionStorage.getItem('student-csv-preview');
        if (staged) {
            try {
                setCsvPreviewRows(JSON.parse(staged));
                openCsvPreview(true);
            } catch (e) {
                sessionStorage.removeItem('student-csv-preview');
            }
        }
    }, []);

    // Keep the staged copy in sync with in-grid edits, so a refresh mid-review
    // doesn't silently discard corrections made before finalizing.
    useEffect(() => {
        if (csvPreview) {
            sessionStorage.setItem('student-csv-preview', JSON.stringify(csvPreviewRows));
        }
    }, [csvPreview, csvPreviewRows]);

    const originalData = {
        first_name: "",
        middle_name: "",
        last_name: "",
        suffix: "",
        user_id: "",
        sex: "m",
        user_type: "",
        username: "",
        password: "",
        confirm_password: "",
    }

    const sex = [
        { val: 'm', label: 'Male' },
        { val: 'f', label: 'Female' },
    ]
    const userType = [
        { val: "student", label: "Student" },
        { val: "itrc", label: "System Admin" },
        { val: "prefect", label: "Prefect of Discipline" },
        { val: "faculty", label: "Faculty" },
        { val: "program_head", label: "Program Head" },
        { val: "staff", label: "Non-Teaching Staff" },
        { val: "parent", label: "Parent" },
    ]
    const yearLevel = [
        { val: 1, label: "1st Year" },
        { val: 2, label: "2nd Year" },
        { val: 3, label: "3rd Year" },
        { val: 4, label: "4th Year" },    
    ]
    const handleFileChange = (e, t) => {
        const file = e.target.files[0];
        setValidationError((prev) => ({ ...prev, file: '' }))
        if(file) {
            setUserType(t)
            validateCSV(file, t)
            .then((param) => {
                if(param[0] && param[1]) {
                    if (t === 'student') {
                        previewStudentCsvFile(file)
                    } else {
                        showWarningModal(
                            `Are You Sure You Want To Upload The CSV File to Generate ${toTitleCase(type)} Accounts?`,
                            'Upload File',
                            'Cancel',
                            () => handleSubmit(file),
                            () =>  {
                                setCSVFile(null);
                            }
                        )
                    }
                }
                // else: validateCSV already recorded the specific error in validationError.file
            })
            .catch(() => {
                // validateCSV already recorded the specific error in validationError.file
            })
        }else {
            setCSVFile(null)
            openUserListCSV(false)
        }
    }
    const handleToggle = (e) => {
        activateAccount(e.target.checked)
    }
    const roleMap = {
        student: 'student',
        faculty: 'teaching_staff',
        staff: 'non_teaching_staff',
    }
    const handleSubmit = (f) => {
        const data = {
            file: f,
            role: roleMap[type] ?? type,
            ...(type === 'faculty' ? { position: 'faculty' } : {}),
            activate: activate
        }
        openUserListCSV(false)
        setUploadingCSV(true)

        RegisterService.uploadUserCsv(data, success, error)
    }
    const success = () => {
        setUploadingCSV(false)
        showOutputModal(
            `${toTitleCase(type)} CSV File Uploaded Successfully. We Will Notify You Once All Accounts Are Completely Generated.`,
            's',
            () => {}
        )
    }
    const previewStudentCsvFile = (file) => {
        setUploadingCSV(true)
        const data = new FormData()
        data.append('file', file)
        RegisterService.previewStudentCsv(
            data,
            (res) => {
                setCsvPreviewRows(res.rows)
                sessionStorage.setItem('student-csv-preview', JSON.stringify(res.rows))
            },
            () => {
                setUploadingCSV(false)
                openUserListCSV(false)
                openCsvPreview(true)
            },
            (e) => {
                setCSVFile(null)
                setUploadingCSV(false)
                showOutputModal(
                    `Error Parsing CSV File. ${e.response?.data?.message ?? ''}`,
                    'e',
                    () => {}
                )
            }
        )
    }
    const cancelCsvPreview = () => {
        setCsvPreviewRows([])
        sessionStorage.removeItem('student-csv-preview')
        openCsvPreview(false)
        setCSVFile(null)
    }
    const finalizeStudentCsv = () => {
        setCsvBatchTotal(csvPreviewRows.length)
        openCsvPreview(false)
        loadRegister(true, 'text-wait', 'Starting Student Account Generation')
        RegisterService.commitStudentCsv(
            csvPreviewRows.map((r) => r.data), activate,
            (res) => {
                setCsvBatchId(res.batch_id)
            },
            () => {
                loadRegister(false)
                sessionStorage.removeItem('student-csv-preview')
                openCsvProgress(true)
            },
            (e) => {
                loadRegister(true, '')
                showOutputModal(
                    `Error Starting Account Generation. ${e.response?.data?.message ?? ''}`,
                    'e',
                    () => loadRegister(false)
                )
            }
        )
    }
    const closeCsvProgress = () => {
        openCsvProgress(false)
        setCsvPreviewRows([])
        setCsvBatchId(null)
        setCsvBatchTotal(0)
        setCSVFile(null)
    }
    const error = (e) => {
        const err = e.response.data.message
        setUploadingCSV(false)
        showOutputModal(
            `Error in Uploading ${toTitleCase(type)} CSV File. ${err}`,
            'e',
            () => {}
        )
    }
    const handleDownloadErrorClick = (txt) => {
        setTimeout(() => {
            const blob = new Blob([txt], { type: 'text/plain' }),
                  url = URL.createObjectURL(blob)

            const a = document.createElement('a')

            a.href = url
            a.download = 'error-account-generation.txt'
            a.click()

            URL.revokeObjectURL(url)
        }, 0)
    }
    const validateCSV = (file, t) => {
        return new Promise((resolve, reject) => {
            const validMimeTypes = [
                "text/csv",
                "application/vnd.ms-excel", // some browsers use this MIME
            ];

            const isCSV =
                validMimeTypes.includes(file.type) ||
                file.name.toLowerCase().endsWith(".csv");

            // 1️⃣ Check file type
            if (!isCSV) {
                setValidationError((prev) => ({
                    ...prev,
                    file: "Invalid file type. Please upload a CSV file.",
                }));
                reject("Invalid file type");
                return;
            }

            // 2️⃣ Validate file name format (student-program-name(...).csv)
            const fileName = file.name.toLowerCase().replace('.csv', '');
            const validFileNamePattern =
                /^(enrolled-pczc-students|faculty-pczc|staff)$/;
            const f = (type == 'student' ? 'enrolled-pczc-students' : (type == 'faculty' ? 'faculty-pczc' : 'staff'));
            if (!validFileNamePattern.test(fileName)) {
                setValidationError((prev) => ({
                    ...prev,
                    file:
                        `Invalid file name format. Expected pattern: ${f}.csv`,
                }));
                reject("Invalid file name");
                return;
            }

            // 3️⃣ Define required columns
            const commonCol = ["id", "first_name", "middle_name", "last_name", "sex", "email"];
            const col = {
                student: ["id", "first_name", "middle_name", "last_name", "suffix", "sex", "email", "program", "year_level", "school_year", "enrolled_at"],
                faculty: commonCol.concat(["program"]),
                administrative: commonCol.concat(["program"]),
                staff: commonCol.concat(["work_type"]),
            };

            const requiredCols = col[t].map((h) => h.toLowerCase().trim());

            const reader = new FileReader();

            reader.onload = function (e) {
                const text = e.target.result.trim();
                const rows = text.split("\n").map((row) => row.split(","));
                const headers = rows[0].map((h) => h.toLowerCase().trim());

                // 4️⃣ Check column order & match
                const hasExactOrder =
                    headers.length === requiredCols.length &&
                    headers.every((h, i) => h === requiredCols[i]);

                // 5️⃣ Check row count
                const rowCount = rows.length - 1;
                const hasRows = rowCount >= 1;

                // 6️⃣ Validate program (only if "program" column exists)
                let invalidPrograms = [];
                const programIndex = headers.indexOf("program");
                if (programIndex !== -1) {
                    const isNameBased = t === 'student';
                    const validPrograms = isNameBased
                        ? props.program.map((p) => p.name.toLowerCase())
                        : props.program.map((p) => String(p.id));
                    for (let i = 1; i < rows.length; i++) {
                        const programVal = rows[i][programIndex]?.trim();
                        const check = isNameBased ? programVal?.toLowerCase() : programVal;
                        if (programVal && !validPrograms.includes(check)) {
                            invalidPrograms.push({ row: i + 1, value: programVal });
                        }
                    }
                }

                // 🧠 Error messages
                const errCol = () =>
                    setValidationError((prev) => ({
                        ...prev,
                        file: `Invalid column order. Expected: [${requiredCols.join(", ")}]. Found: [${headers.join(", ")}]`,
                    }));

                const errRowMin = () =>
                    setValidationError((prev) => ({
                        ...prev,
                        file: "CSV must contain at least 1 data row.",
                    }));

                const errProgram = () =>
                    setValidationError((prev) => ({
                        ...prev,
                        file:
                            `Invalid program${t === 'student' ? ' names' : ' IDs'} found at rows: ${invalidPrograms
                                .map((r) => `${r.row} (${r.value})`)
                                .join(", ")}. ` +
                            `Allowed ${t === 'student' ? 'names' : 'IDs'}:\n` +
                            props.program.map((p) => `${t === 'student' ? p.name : p.id} - ${p.description}`).join("\n"),
                    }));

                // Final validation results
                const isValid =
                    hasExactOrder && hasRows && invalidPrograms.length === 0;

                if (!hasExactOrder) errCol();
                else if (!hasRows) errRowMin();
                else if (invalidPrograms.length > 0) errProgram();

                resolve([isValid, hasExactOrder, hasRows, invalidPrograms]);
            };

            reader.onerror = () => reject("Error reading file");
            reader.readAsText(file);
        });
    };


    return (
        <>
        <CsvStudentProgressModal
            close={csvProgress}
            closeModal={openCsvProgress}
            batchId={csvBatchId}
            total={csvBatchTotal}
            userId={props.user?.id}
            onDone={closeCsvProgress}
        />
        <NormalValidationModal
            close={userListCSV}
            closeModal={openUserListCSV} 
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true} 
            icon={UserPlus}
            label={validationLabel}
            btn={[
                { 
                    label: 'Cancel', 
                    click: () => {
                        setCSVFile(null); 
                        openUserListCSV(false);
                    }, 
                    satisfied: false 
                },
                { 
                    label: 'Create Account', 
                    click: handleSubmit, 
                    satisfied: true 
                },
            ]}
        />
        {csvPreview ? (
            <CsvStudentPreviewPage
                rows={csvPreviewRows}
                onCancel={cancelCsvPreview}
                onFinalize={finalizeStudentCsv}
                onRowsChange={setCsvPreviewRows}
                onValidateRow={(row, onResult, onError) =>
                    RegisterService.validateStudentCsvRow(row, onResult, () => {}, onError)
                }
                programOptions={(props.program ?? []).map((p) => p.name)}
                schoolYearOptions={(props.school_years ?? []).map((s) => s.year)}
            />
        ) : (
        <div className="w-full py-4 grid gap-4">
            <div className="w-full grid gap-5 relative">
                <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                    <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">USER REGISTRATION</h1>
                </div>
            </div>
            <div className="grid gap-5">
                <div className="flex shadow-gray-400 shadow-md rounded-md">
                    <div className="px-10 py-14 w-full bg-white">
                        <div className="flex gap-20 relative justify-center">
                            <div className="w-[25rem] h-full flex-shrink-0 object-cover absolute z-[0] opacity-20">
                                <img src={logo} alt="" />
                            </div>
                            <div className="z-[1] w-full">
                                <RegistrationForm
                                    baseData={originalData}
                                    selectionVal={[ sex, userType, props.program, yearLevel, props.school_years ]}
                                    validationErr={validationError}
                                    activate={activate}
                                    reload={loadRegister}
                                    setValidationError={setValidationError}
                                    handleFileChange={handleFileChange}
                                    setValidationLabel={setValidationLabel}
                                    setCSVColumn={setCSVColumn}
                                    handleToggle={handleToggle}
                                    setUserType={setUserType}
                                    uploadingCSV={uploadingCSV}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        )}
        </>
    );
};

Register.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Register;
