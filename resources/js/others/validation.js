// Shared frontend form validation, so every form checks its fields the same
// way before it's sent (the server still validates too — this just catches
// mistakes early and shows them next to the field).
//
// A schema maps each field name to a list of rules:
//   const errors = validateForm(data, {
//       first_name: [required("First name"), personName()],
//       email: [required("Email"), email()],
//   })
// `errors` is { field: "message", fieldAsterisk: true } for every field that
// failed (only its first failing rule), the shape FormTextfield and the other
// inputs already read via `error` / `errorAsterisk`. Empty when all pass.

export const isBlank = (v) => {
    if (v === null || v === undefined) return true
    if (Array.isArray(v)) return v.length === 0
    // Rich text: "<p></p>" with no actual text counts as empty.
    if (typeof v === "string") return v.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === ""
    return false
}

// ---- rules (each returns an error message, or null when it passes) ---------
export const required = (label = "This field") => (v) => (isBlank(v) ? `${label} is required.` : null)

export const email = () => (v) =>
    isBlank(v) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? null : "Enter a valid email address."

// Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.
export const phMobile = () => (v) =>
    isBlank(v) || /^(09\d{9}|\+639\d{9})$/.test(String(v).replace(/[\s-]/g, "")) ? null : "Enter a valid mobile number (e.g. 09171234567)."

// Letters (any language), spaces, apostrophes, periods and hyphens.
export const personName = () => (v) =>
    isBlank(v) || /^[\p{L}][\p{L} .'-]*$/u.test(String(v).trim()) ? null : "Use letters only."

export const minLength = (n, label = "This field") => (v) =>
    isBlank(v) || String(v).replace(/<[^>]*>/g, "").trim().length >= n ? null : `${label} must be at least ${n} characters.`

export const maxLength = (n, label = "This field") => (v) =>
    isBlank(v) || String(v).replace(/<[^>]*>/g, "").trim().length <= n ? null : `${label} must be at most ${n} characters.`

export const oneOf = (values, message = "Choose a valid option.") => (v) =>
    isBlank(v) || values.map(String).includes(String(v)) ? null : message

export const pattern = (regex, message) => (v) => (isBlank(v) || regex.test(String(v).trim()) ? null : message)

export const dateNotBefore = (min, message) => (v) =>
    isBlank(v) || new Date(v) >= new Date(min) ? null : message

export const dateAfter = (getOther, message) => (v, data) => {
    const other = getOther(data)
    return isBlank(v) || isBlank(other) || new Date(v) >= new Date(other) ? null : message
}

// A rule that only applies when `when(data)` is true.
export const requiredIf = (when, label = "This field") => (v, data) => (when(data) && isBlank(v) ? `${label} is required.` : null)

// ---- running a schema --------------------------------------------------------
export const validateForm = (data, schema) => {
    const errors = {}
    for (const [field, rules] of Object.entries(schema)) {
        for (const rule of rules) {
            const message = rule(data?.[field], data)
            if (message) {
                errors[field] = message
                errors[`${field}Asterisk`] = true
                break
            }
        }
    }
    return errors
}

export const hasErrors = (errors) => Object.keys(errors).length > 0

// Scrolls to the first field that has an error, so it isn't missed on a
// long form or a scrolling modal.
export const focusFirstError = (errors) => {
    const first = Object.keys(errors).find((k) => !k.endsWith("Asterisk"))
    if (!first) return
    requestAnimationFrame(() => {
        const el = document.querySelector(`[name="${first}"], #${CSS.escape(first)}`)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        if (el && typeof el.focus === "function") el.focus({ preventScroll: true })
    })
}
