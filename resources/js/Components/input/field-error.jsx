import { FormHelperText } from "@mui/material"

// A validation message under inputs that don't show their own error (date
// ranges, user search boxes, file pickers...): MUI's error helper text.
// Renders nothing when there's no message.
const FieldError = ({ msg }) =>
    msg ? <FormHelperText error sx={{ mt: -0.5, mx: 0, fontWeight: 600, fontSize: 13 }}>{msg}</FormHelperText> : null

export default FieldError
