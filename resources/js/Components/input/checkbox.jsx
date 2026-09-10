import { Checkbox, FormControlLabel } from "@mui/material"

const objConvert = (list) => list.map(e => {
    const [value = null, label = null] = Object.values(e) || []
    return { value, label }
})

const CheckBoxButton = ({ list, label, flex, name, id, change, val }) => {
    const options = objConvert(list)

    return (
        <div className="text-[0.9em]">
            <div className="sticky top-0 bg-white">
                <label>{label}</label>
            </div>
            <div className={`${(flex) ? 'flex gap-2 items-center flex-wrap' : ''}`}>
                {options.map((e, i) => (
                    <FormControlLabel
                        key={i}
                        control={
                            <Checkbox
                                size="small"
                                id={`${id}${i}`}
                                name={`${name}[]`}
                                value={e.value}
                                // `val` (the currently-selected array) wasn't
                                // previously accepted by this component at
                                // all, so a caller passing it (e.g.
                                // view-gatepass-modal.jsx's `val={data2.allow_to}`)
                                // had it silently ignored — wiring it up here
                                // makes the checkbox actually reflect state
                                // instead of relying on the DOM's own
                                // uncontrolled toggle happening to look right.
                                checked={Array.isArray(val) ? val.includes(e.value) : false}
                                onChange={change}
                            />
                        }
                        label={e.label}
                    />
                ))}
            </div>
        </div>
    )
}

const CheckBox = ({
    label,
    name,
    id,
    change,
    checked
}) => {
    return (
        <FormControlLabel
            control={
                <Checkbox
                    size="small"
                    id={id}
                    name={name}
                    checked={!!checked}
                    onChange={change}
                />
            }
            label={label}
        />
    )
}

CheckBoxButton.CheckBox = CheckBox

export default CheckBoxButton
