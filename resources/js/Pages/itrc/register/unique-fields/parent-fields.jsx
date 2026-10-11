import FormTextfield from "@/Components/input/form-input"
import { change } from "@/others/function"
import { useForm } from "@inertiajs/react"
import DropdownField from "@/Components/input/dropdown"
import FormButton from "@/Components/button/button"
import RadioButton from "@/Components/input/radio"

const ParentFields = ({ data, handleChange }) => {
    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <DropdownField
                default={{ val: "", label: "Relationship to Child" }}
                list={[
                    { val: "mother", label: "Mother" },
                    { val: "father", label: "Father" },
                    { val: "guardian", label: "Guardian" },
                    { val: "relative", label: "Relative" },
                ]}
                val={data.parent_role}
                onChange={handleChange}
                name="parent_role"
            />
            <FormTextfield
                label="Occupation"
                name="work_occupation"
                val={data.work_occupation}
                change={handleChange}
            />
        </div>
    )
}
export default ParentFields