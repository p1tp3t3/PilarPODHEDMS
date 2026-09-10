import DropdownField from "@/Components/input/dropdown";
import FormTextfield from "@/Components/input/form-input";

const StudentFields = ({ data, handleChange, selectionVal, validationErr }) => {
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
        <div className="flex flex-col sm:flex-row gap-3 w-full">
            <DropdownField
                default={{ val: "", label: "Select School Year" }}
                val={data.school_year_id}
                onChange={handleChange}
                list={selectionVal[4]}
                name="school_year_id"
                error={validationErr.school_year_id}
            />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
            <FormTextfield
                label="Enrolled Since"
                name="enrolled_at"
                type="date"
                val={data.enrolled_at}
                change={handleChange}
                error={validationErr.enrolled_at}
            />
        </div>
        </>
    )
};
export default StudentFields;
