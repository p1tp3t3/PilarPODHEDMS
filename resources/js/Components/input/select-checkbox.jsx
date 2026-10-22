import { Checkbox, FormControlLabel } from "@mui/material"

// MUI checkbox for row selection in bulk-action lists (complaints, accounts,
// notifications). Uncontrolled, with `name`/`value` on the real <input>, so
// pages keep collecting the selection the way they already do:
//   document.querySelectorAll('input[name="selected-row"]:checked')
export const SelectCheckbox = ({ name = "selected-row", value, label, onClick, sx }) => (
    <Checkbox
        size="small"
        value={value}
        onClick={onClick}
        inputProps={{ name, "aria-label": label }}
        sx={{ p: 0.5, ...sx }}
    />
)

// "Select all" for those lists. MUI keeps its own checked state (that's what
// draws the box), so setting input.checked directly would leave the boxes
// looking unticked; clicking each one that differs goes through MUI's own
// change handling, so the input and its visuals stay in step.
export const setRowsChecked = (checked, selector = 'input[name="selected-row"]') => {
    document.querySelectorAll(selector).forEach((input) => {
        if (input.checked !== checked) input.click()
    })
}

// A MUI checkbox with its label, sized to sit in body text.
export const LabeledCheckbox = ({ label, className = "", ...props }) => (
    <FormControlLabel
        className={className}
        control={<Checkbox size="small" sx={{ p: 0.5 }} {...props} />}
        label={label}
        sx={{ m: 0, gap: 0.5, "& .MuiFormControlLabel-label": { fontSize: "inherit" } }}
    />
)
