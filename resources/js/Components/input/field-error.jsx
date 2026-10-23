// A validation message under inputs that don't show their own error (date
// ranges, user search boxes, file pickers...). Renders nothing when there's
// no message. Same look as the errors FormTextfield / DropdownField show.
const FieldError = ({ msg }) =>
    msg ? <div className="text-[#d12323] text-[13px] font-[600] -mt-1">{msg}</div> : null

export default FieldError
