import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from "@mui/material"
import { Download } from "lucide-react"

const TYPE_LABELS = {
  enrollment_update: "Enrollment Update",
}

const UploadGuidelines = (props) => {
  const typeLabel = TYPE_LABELS[props.type] ?? props.type
  const userType = () => {
    const baseFields = [
      { field: "id", value: "School I.D (must start with 'C' followed by digits)", example: "c2210213" },
      { field: "first_name", value: "Given name of the user", example: "John" },
      { field: "middle_name", value: "Middle name of the user", example: "Alexander" },
      { field: "last_name", value: "Surname or family name", example: "Doe" },
      { field: "sex", value: "Sex", example: "m/f" },
      { field: "email", value: "Email", example: "email123@gmail.com" },
    ];

    switch (props.type) {
      case "student":
        return [
          { field: "id", value: "School I.D (must start with 'C' followed by digits)", example: "c2210213" },
          { field: "first_name", value: "Given name of the user", example: "John" },
          { field: "middle_name", value: "Middle name of the user", example: "Alexander" },
          { field: "last_name", value: "Surname or family name", example: "Doe" },
          { field: "suffix", value: "Name suffix, if any (Optional — can be left blank)", example: "Jr." },
          { field: "sex", value: "Sex", example: "m/f" },
          { field: "email", value: "Email", example: "email123@gmail.com" },
          { field: "program", value: "Program enrolled, by name (e.g. BSIT, BEED)", example: "BSIT" },
          { field: "year_level", value: "Year level", example: "2" },
          { field: "enrolled_at", value: "Date enrolled (YYYY-MM-DD)", example: "2024-08-15" },
        ];
      case "faculty":
        return baseFields.concat([
          { field: "program", value: "Assigned program (1=BSIT, 2=BLIS, etc.)", example: "1" },
        ]);
      case "administrative":
        return baseFields.concat([
          { field: "type", value: "Role type (program_dean, college_dean)", example: "program_dean" },
          { field: "program (Optional)", value: "Optional program assignment", example: "3" },
        ]);
      case "staff":
        return baseFields.concat([
          { field: "position", value: "Assigned position, by exact name", example: props.positions?.[0]?.name ?? "Guard" },
        ]);
      case "enrollment_update":
        return [
          { field: "id", value: "School I.D of an already-registered student", example: "c2210213" },
          { field: "program", value: "Program enrolled, by name (e.g. BSIT, BEED)", example: "BSIT" },
          { field: "year_level", value: "Year level", example: "2" },
          { field: "enrolled_at", value: "Date enrolled (YYYY-MM-DD)", example: "2024-08-15" },
        ];
      default:
        return baseFields;
    }
  };

  const fileName = () => {
    if (props.type == 'student') return 'enrolled-pczc-students'
    if (props.type == 'faculty') return 'faculty-pczc'
    if (props.type == 'administrative') return 'administrative-program name(bachelor-of-science-in-information-technoology)'
    if (props.type == 'staff') return 'staff'
    if (props.type == 'enrollment_update') return 'enrollment-update-template'
  }

  const data = userType();

  const downloadTemplate = () => {
    const headerRow = data.map((d) => d.field.replace(' (Optional)', '')).join(',')
    const exampleRow = data.map((d) => d.example).join(',')
    const csvContent = `${headerRow}\n${exampleRow}\n`

    const blob = new Blob([csvContent], { type: 'text/csv' }),
          url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName()}.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Notes */}
      <div className="text-sm text-gray-700">
        <ul className="list-disc pl-6">
          {(props.type == 'student' || props.type == 'faculty' || props.type == 'administrative' || props.type == 'staff') &&
          <li>Accepted file name: <b>{fileName()}.csv</b></li>}
          <li>Accepted file type: <b>.csv</b></li>
          <li>The first row must contain exact field names as shown below.</li>
          {(props.type == 'student' || props.type == 'enrollment_update') &&
          <li>School year and semester are not part of the file — every row is enrolled under whichever school year/semester is currently active.</li>}
          {(props.type == 'student' || props.type == 'enrollment_update') &&
          <li>
            <div>Program must match one of these program names exactly:</div>
            <ul>
              {props.program.map((e, i) => <li key={i}>{e.name} - {e.description}</li>)}
            </ul>
          </li>}
          {(props.type == 'faculty' || props.type == 'administrative') &&
          <li>
            <div>Program must be their corresponding ID</div>
            <ul>
              {props.program.map((e, i) => <li key={i}>{e.id} - {e.description}</li>)}
            </ul>
          </li>}
          {props.type == 'staff' &&
          <li>
            <div>Position must match one of these exactly (case-sensitive):</div>
            <ul>
              {(props.positions ?? []).map((e, i) => <li key={i}>{e.name}</li>)}
            </ul>
          </li>}
        </ul>
      </div>

      {/* Transposed Table */}
      <TableContainer sx={{ width: "100%", border: "1px solid #d1d5db" }}>
        <Table sx={{ width: "100%", fontSize: "0.875rem", textAlign: "center" }}>
          <TableHead>
            <TableRow sx={{ "& .MuiTableCell-root": { backgroundColor: "#f3f4f6", border: "1px solid #d1d5db" } }}>
              {data.map((item, idx) => (
                <TableCell key={idx} align="center">
                  {item.field}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ "& .MuiTableCell-root": { backgroundColor: "#f9fafb", border: "1px solid #d1d5db" } }}>
              {data.map((item, idx) => (
                <TableCell key={idx} align="center" sx={{ fontFamily: "monospace", color: "#1d4ed8" }}>
                  {item.example}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Template download */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Download size={14} /> Download CSV Template
        </button>
      </div>

      {/* Reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p>
          ⚠️ Ensure that column headers in your CSV match the field names above exactly (case-sensitive).
        </p>
      </div>
    </div>
  );
};

export default UploadGuidelines;
