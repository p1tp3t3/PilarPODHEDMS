import DropdownField from "@/Components/input/dropdown"

const StaffFields = ({ data, handleChange, selectionVal, validationErr }) => {
    const positions = selectionVal?.[5] ?? []

    return (
        <div className="grid gap-5">
            <DropdownField
                default={{ val: "", label: "Select Position" }}
                list={positions.map((p) => ({ val: p.name, label: p.name }))}
                val={data.position}
                onChange={handleChange}
                name="position"
                titleCase={true}
                error={validationErr.position}
            />
        </div>
    )
}


export default StaffFields
