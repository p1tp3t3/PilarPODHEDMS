import { useMemo, useCallback } from "react"
import FormButton from "../button/button"
import Btn from "../button/normal-btn"
import ActionBtn from "../button/action-btn"
import { DataGrid } from "@/Components/other/data-grid"
import Box from "@mui/material/Box"
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react"

const DEFAULT_COLUMNS = [
    { field: "student_id", headerName: "ID", width: 110 },
    { field: "first_name", headerName: "First Name", width: 130 },
    { field: "middle_name", headerName: "Middle Name", width: 130 },
    { field: "last_name", headerName: "Last Name", width: 130 },
    { field: "suffix", headerName: "Suffix", width: 90 },
    { field: "sex", headerName: "Sex", width: 80 },
    { field: "email", headerName: "Email", width: 200 },
    { field: "program", headerName: "Program", width: 150 },
    { field: "year_level", headerName: "Year Level", width: 110 },
    { field: "enrolled_at", headerName: "Enrolled Since", width: 140 },
]

const dateFromISO = (value) => (value ? new Date(`${value}T00:00:00`) : null)
const isoFromDate = (value) => (value instanceof Date && !isNaN(value) ? value.toLocaleDateString("en-CA") : "")

// Any field with a fixed/known set of valid values becomes a picker
// (MUI DataGrid's date editor or a singleSelect dropdown) instead of free
// text — fields not listed here (name, email, etc.) stay plain text edits.
const withFieldEditor = (column, { programOptions }) => {
    switch (column.field) {
        case "enrolled_at":
            return {
                ...column,
                type: "date",
                valueGetter: (value) => dateFromISO(value),
                valueFormatter: (value) => (value ? value.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""),
            }
        case "year_level":
            return { ...column, type: "singleSelect", valueOptions: [1, 2, 3, 4] }
        case "program":
            return programOptions?.length ? { ...column, type: "singleSelect", valueOptions: programOptions } : column
        default:
            return column
    }
}

const CsvStudentPreviewPage = ({
    rows, onCancel, onFinalize, onRowsChange, onValidateRow,
    title = "Review Student CSV",
    finalizeLabel = "Finalize & Create",
    finalizeSuffix = "Account(s)",
    columns: columnsOverride,
    programOptions,
}) => {
    const validCount = rows?.filter((r) => r.valid).length ?? 0
    const invalidCount = (rows?.length ?? 0) - validCount

    const gridRows = useMemo(() => {
        if (!rows) return []
        return rows.map((r) => ({
            ...r.data,
            // r.data has its own "id" (the CSV's student ID column) — kept
            // separately as student_id since DataGrid's row-identity "id"
            // must always be the unique row_index instead: duplicate/
            // invalid IDs are exactly what this table is meant to flag.
            student_id: r.data.id,
            id: r.row_index,
            index: r.row_index + 1,
            valid: r.valid,
            errors: r.errors?.join(" "),
        }))
    }, [rows])

    const editableColumns = useMemo(
        () => (columnsOverride ?? DEFAULT_COLUMNS).map((c) => withFieldEditor({ ...c, editable: true }, { programOptions })),
        [columnsOverride, programOptions]
    )

    // A cell edit fixes bad data right in the review grid instead of forcing
    // a re-export/re-upload of the whole CSV — re-validated against the same
    // server-side rules the eventual commit will use, so the status/errors
    // shown here stay truthful rather than freezing at whatever the initial
    // upload found.
    const processRowUpdate = useCallback((newRow) => {
        const data = { ...newRow, id: newRow.student_id }
        if (data.enrolled_at instanceof Date) data.enrolled_at = isoFromDate(data.enrolled_at)
        delete data.student_id
        delete data.index
        delete data.valid
        delete data.errors

        return new Promise((resolve) => {
            const applyResult = ({ valid, errors }) => {
                const updatedRow = { ...newRow, valid, errors: errors?.join(" ") }

                onRowsChange?.((prev) => prev.map((r) =>
                    r.row_index === newRow.id ? { ...r, data, valid, errors } : r
                ))

                resolve(updatedRow)
            }

            if (onValidateRow) {
                onValidateRow(data, applyResult, () => resolve(newRow))
            } else {
                applyResult({ valid: newRow.valid, errors: newRow.errors ? [newRow.errors] : [] })
            }
        })
    }, [onRowsChange, onValidateRow])

    const handleDeleteRow = useCallback((rowIndex) => {
        onRowsChange?.((prev) => prev.filter((r) => r.row_index !== rowIndex))
    }, [onRowsChange])

    // A manually-added row starts empty/flagged — editing any of its cells
    // triggers the same processRowUpdate re-validation as every other row,
    // so this placeholder message is replaced by real field errors the
    // moment the admin starts filling it in.
    const handleAddRow = useCallback(() => {
        const nextIndex = (rows ?? []).reduce((max, r) => Math.max(max, r.row_index), -1) + 1
        onRowsChange?.((prev) => [...prev, {
            row_index: nextIndex,
            data: {},
            valid: false,
            errors: ["New row — fill in the fields."],
        }])
    }, [rows, onRowsChange])

    const columns = useMemo(() => [
        { field: "index", headerName: "#", width: 60 },
        {
            field: "valid",
            headerName: "Status",
            width: 90,
            renderCell: (params) => (
                params.value
                    ? <CheckCircle2 size={16} className="text-green-700" />
                    : <AlertCircle size={16} className="text-red-600" />
            ),
        },
        ...editableColumns,
        {
            field: "errors",
            headerName: "Errors",
            width: 260,
            renderCell: (params) => (
                <span className="block w-full whitespace-normal leading-snug py-2" style={{ color: "#dc2626" }}>
                    {params.value}
                </span>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "",
            width: 60,
            sortable: false,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => (
                <ActionBtn
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => handleDeleteRow(params.row.id)}
                    title="Remove this row"
                >
                    <Trash2 size={14} />
                </ActionBtn>
            ),
        },
    ], [editableColumns, handleDeleteRow])

    return (
        <div className="w-full py-4 grid gap-4">
            <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                <h1 className="text-[1.3em] sm:text-[1.4em] font-bold text-gray-800">{title}</h1>
                <Btn onclick={onCancel}>
                    <ArrowLeft size={14} /> Back
                </Btn>
            </div>

            <div className="w-full bg-white rounded-md shadow-sm border border-gray-200 p-5 grid gap-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <p className="text-[0.9em] text-gray-600">
                        {rows?.length ?? 0} row(s) found &mdash;{" "}
                        <span className="text-green-700 font-semibold">{validCount} valid</span>,{" "}
                        <span className="text-red-600 font-semibold">{invalidCount} flagged</span>.
                        Flagged rows will be skipped and reported as errors during processing — double-click a cell to fix it in place.
                    </p>
                    <ActionBtn className="bg-blue-600 hover:bg-blue-700" onClick={handleAddRow}>
                        <Plus size={14} /> Add Row
                    </ActionBtn>
                </div>

                <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", height: "65vh" }}>
                    <DataGrid
                        rows={gridRows}
                        columns={columns}
                        hideFooter
                        disableRowSelectionOnClick
                        getRowHeight={() => "auto"}
                        showToolbar
                        processRowUpdate={processRowUpdate}
                        onProcessRowUpdateError={() => {}}
                        getRowClassName={(params) => (params.row.valid ? "" : "csv-invalid-row")}
                        sx={{
                            "& .MuiDataGrid-toolbarContainer": {
                                minHeight: "2.75rem",
                                paddingBlock: "0.4rem",
                            },
                            "& .MuiDataGrid-cell": {
                                display: "flex",
                                alignItems: "center",
                            },
                            "& .csv-invalid-row": { backgroundColor: "#fef2f2" },
                            "& .csv-invalid-row:hover": { backgroundColor: "#fee2e2" },
                        }}
                    />
                </Box>

                <div className="flex justify-end gap-3 pt-2">
                    <Btn onclick={onCancel}>
                        Cancel
                    </Btn>
                    <FormButton
                        label={`${finalizeLabel} ${validCount} ${finalizeSuffix}`}
                        click={onFinalize}
                        enable={validCount > 0}
                    />
                </div>
            </div>
        </div>
    )
}
export default CsvStudentPreviewPage
