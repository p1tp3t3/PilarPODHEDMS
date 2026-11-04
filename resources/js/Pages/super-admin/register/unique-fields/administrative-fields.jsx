import FormTextfield from "@/Components/input/form-input"
import { change } from "@/others/function"
import { useForm } from "@inertiajs/react"
import DropdownField from "@/Components/input/dropdown"
import FormButton from "@/Components/button/button"
import RadioButton from "@/Components/input/radio"

const AdministrativeFields = ({ data, handleChange, selectionVal, validationErr }) => {
    return (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
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
export default AdministrativeFields