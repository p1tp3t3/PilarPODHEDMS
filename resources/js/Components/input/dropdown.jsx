import { toTitleCase } from "@/others/function"
import { FormControl, Select, MenuItem, FormHelperText, Autocomplete, TextField, createFilterOptions } from "@mui/material"

const muiFieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.85em' },
}

const objConvert = (list) => list.map(e => {
    const [value = null, label = null] = Object.values(e) || []
    return { value, label }
})

const DropdownField = (props) => {
    const options = objConvert(props.list)
    const value = props.val ?? ""
    const defaultOption = props.default ? { value: props.default.val, label: props.default.label } : null
    const hasMatch = (defaultOption && defaultOption.value === value) || options.some(o => o.value === value)

    const optionLabel = (e) => props.titleCase ? toTitleCase(e.label) : e.label?.toUpperCase()

    // When the current value matches neither the default nor any option (e.g.
    // val is null/unset before a URL filter is applied), fall back to showing
    // the default's label instead of a blank box — the hidden fallback
    // MenuItem below (added only to avoid MUI's "out of range value" console
    // warning) has no visible content, so without this the box would render
    // empty even though a default exists.
    const renderValue = (v) => {
        if (defaultOption && defaultOption.value === v) return defaultOption.label
        const match = options.find(o => o.value === v)
        if (match) return optionLabel(match)
        if (defaultOption) return defaultOption.label
        return options[0] ? optionLabel(options[0]) : ""
    }

    return (
        <div className="w-full">
            <FormControl size="small" fullWidth error={!!props.error} required={props.req}>
                <Select
                    name={props.name}
                    value={value}
                    onChange={(e) => props.onChange({ target: { name: props.name, value: e.target.value } })}
                    displayEmpty
                    renderValue={renderValue}
                    sx={muiFieldSx}
                >
                    {!hasMatch && <MenuItem value={value} sx={{ display: "none" }}></MenuItem>}
                    {defaultOption && <MenuItem value={defaultOption.value}>{defaultOption.label}</MenuItem>}
                    {options.map((e, i) => (
                        <MenuItem key={i} value={e.value}>
                            {optionLabel(e)}
                        </MenuItem>
                    ))}
                </Select>
                {props.error && <FormHelperText>{props.error}</FormHelperText>}
            </FormControl>
        </div>
    )
}

const filter = createFilterOptions()

const Search = ({ list, name, val, onChange, req, error, default: def }) => {
    const options = objConvert(list)
    // Only ever set `value` to a real match, never to `def` — Autocomplete
    // treats its `value` as an actual selection (renders it with a clear
    // button, etc). `def` should just be the placeholder text shown when
    // nothing is genuinely selected, not a selectable/clearable value itself.
    const selected = options.find((o) => o.value === val) ?? null

    return (
        <div className="w-full">
            <Autocomplete
                options={options}
                value={selected}
                getOptionLabel={(o) => o?.label ?? ""}
                isOptionEqualToValue={(o, v) => o?.value === v?.value}
                onChange={(e, newValue) => onChange({ target: { name, value: newValue ? newValue.value : "" } })}
                filterOptions={(opts, state) => {
                    const filtered = filter(opts, state)
                    return def ? [def, ...filtered.filter((o) => o.value !== def.val)] : filtered
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        size="small"
                        placeholder={def?.label ?? "Select..."}
                        error={!!req && !val}
                        sx={muiFieldSx}
                    />
                )}
            />
            {error && <FormHelperText error>{error}</FormHelperText>}
        </div>
    )
}

DropdownField.Search = Search
export default DropdownField
