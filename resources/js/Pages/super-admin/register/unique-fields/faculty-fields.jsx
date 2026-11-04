import DropdownField from "@/Components/input/dropdown"

const FacultyFields = ({ data, handleChange, selectionVal, validationErr }) => {
    return (
        <div>
            <DropdownField
                default={{ val: "", label: "Select Program" }}
                list={selectionVal[2]}
                val={data.program}
                onChange={handleChange}
                name="program"
                error={validationErr.program}
            />
        </div>
    )
}
export default FacultyFields