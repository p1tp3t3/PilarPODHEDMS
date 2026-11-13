import DropdownField from "@/Components/input/dropdown";
import { usePage } from "@inertiajs/react";

const StudentFields = ({ data, handleChange, selectionVal, validationErr }) => {
    // Students are enrolled in the current school year and semester.
    const current = usePage().props.current_school_year_semester;
    const term = current
        ? `SY ${current.school_year?.year ?? ""} · ${current.semester === 1 ? "1st" : "2nd"} Semester`
        : null;

    return (
        <>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
            <DropdownField
                default={{ val: "", label: "Select Program" }}
                val={data.program}
                onChange={handleChange}
                list={selectionVal[2]}
                name="program"
                error={validationErr.program}
            />
            <DropdownField
                default={{ val: "", label: "Select Year Level" }}
                val={data.year_level}
                onChange={handleChange}
                list={selectionVal[3]}
                name="year_level"
                error={validationErr.year_level}
            />
        </div>
        <div className={`text-[0.85em] ${term ? "text-gray-600" : "text-[#d12323] font-semibold"}`}>
            {term
                ? <>Enrolled in the current term: <b>{term}</b></>
                : "No active school year/semester is set. Set one in School Year Management first."}
        </div>
        </>
    )
};
export default StudentFields;
