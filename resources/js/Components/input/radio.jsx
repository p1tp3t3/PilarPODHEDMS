import { Radio, RadioGroup, FormControlLabel, FormLabel } from "@mui/material"

const objConvert = (list) => list.map(e => {
    const [value = null, label = null] = Object.values(e) || []
    return { value, label }
})

const RadioButton = (props) => {
    const options = objConvert(props.list)

    return (
        <div className="text-[0.9em]">
            {props.label && (
                <FormLabel sx={{ fontSize: 'inherit', color: 'inherit', '&.Mui-focused': { color: 'inherit' } }}>
                    {props.label}
                </FormLabel>
            )}
            <RadioGroup
                row={!!props.flex}
                name={props.name}
                value={props.val ?? ''}
                onChange={props.change}
            >
                {options.map((e, i) => (
                    <FormControlLabel
                        key={i}
                        value={e.value}
                        control={<Radio size="small" id={`${props.id ?? props.name}${i}`} />}
                        label={e.label}
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.95em' } }}
                    />
                ))}
            </RadioGroup>
            <div className="text-[#d12323] text-[12px] flex items-center gap-2">
                <div className="transition-[0.2s] font-[1000]">
                    {props.error}
                </div>
            </div>
        </div>
    )
}
export default RadioButton
