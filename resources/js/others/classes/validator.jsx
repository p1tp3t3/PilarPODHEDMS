import { areObjectArraysEqualByKey, toTitleCase } from "../function"

// Every frontend form check lives here, so each form validates the same way
// and a component only calls one method. The server still validates too;
// this just catches mistakes early and shows them next to the field.
//
// Errors are { field: "message", fieldAsterisk: true }: the shape
// FormTextfield and the other inputs read via `error` / `errorAsterisk`.
// A field that passes is missing or "". Validator.hasErrors() checks either.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LETTERS = /^[A-Za-z\s]+$/
const LETTERS_AND_DIGITS = /(?=.*[A-Za-z])(?=.*\d)/
const NAME_KEYS = ["first_name", "middle_name", "last_name"]
const stripTags = (v) => String(v).replace(/<[^>]*>/g, "")

const ADDRESS = {
    current_place: "Current Place", current_city: "Current City", current_province: "Current Province", current_zipcode: "Current Zipcode",
    permanent_place: "Permanent Place", permanent_city: "Permanent City", permanent_province: "Permanent Province", permanent_zipcode: "Permanent Zipcode",
}
const PERSONAL = { religion: "Religion", citizenship: "Citizenship", date_of_birth: "Date of Birth", place_of_birth: "Place of Birth" }

// Sets `key` and `keyAsterisk` from one check: message when it fails, "" when it passes.
const put = (err, key, message) => {
    err[key] = message || ""
    err[`${key}Asterisk`] = message ? true : ""
}
// "Label is required" when blank (returns true), else clears the asterisk.
const need = (err, field, key, label) => {
    if (!field[key]?.trim()) {
        put(err, key, `${label} is required`)
        return true
    }
    err[`${key}Asterisk`] = ""
    return false
}
// Every key of `labels` required in `source`.
const needAll = (err, source, labels) => {
    for (const [key, label] of Object.entries(labels)) {
        const v = source[key]
        put(err, key, !v || String(v).trim() === "" ? `${label} is required` : "")
    }
}

export class Validator {
    constructor(field = {}, role) {
        this.field = field
        this.role = role
    }

    // ==========================================================================
    // Rules: each returns an error message, or null when it passes.
    // ==========================================================================
    static isBlank(v) {
        if (v === null || v === undefined) return true
        if (Array.isArray(v)) return v.length === 0
        // Rich text: "<p></p>" with no actual text counts as empty.
        if (typeof v === "string") return stripTags(v).replace(/&nbsp;/g, " ").trim() === ""
        return false
    }

    static required = (label = "This field", message) => (v) => (Validator.isBlank(v) ? message ?? `${label} is required.` : null)

    static requiredIf = (when, label = "This field") => (v, data) => (when(data) && Validator.isBlank(v) ? `${label} is required.` : null)

    static email = () => (v) =>
        Validator.isBlank(v) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? null : "Enter a valid email address."

    // Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.
    static phMobile = () => (v) =>
        Validator.isBlank(v) || /^(09\d{9}|\+639\d{9})$/.test(String(v).replace(/[\s-]/g, "")) ? null : "Enter a valid mobile number (e.g. 09171234567)."

    // Letters (any language), spaces, apostrophes, periods and hyphens.
    static personName = () => (v) =>
        Validator.isBlank(v) || /^[\p{L}][\p{L} .'-]*$/u.test(String(v).trim()) ? null : "Use letters only."

    static minLength = (n, label = "This field") => (v) =>
        Validator.isBlank(v) || stripTags(v).trim().length >= n ? null : `${label} must be at least ${n} characters.`

    static maxLength = (n, label = "This field") => (v) =>
        Validator.isBlank(v) || stripTags(v).trim().length <= n ? null : `${label} must be at most ${n} characters.`

    static dateNotBefore = (min, message) => (v) =>
        Validator.isBlank(v) || new Date(v) >= new Date(min) ? null : message

    // ==========================================================================
    // Running rules
    // ==========================================================================

    // schema: { field: [rule, ...] }. Only the first failing rule per field.
    static check(data, schema) {
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

    static hasErrors(errors) {
        return Object.entries(errors ?? {}).some(([key, value]) => !key.endsWith("Asterisk") && !!value)
    }

    // Laravel-style { field: ["message"] } (for forms that show server errors the same way).
    static asServerErrors(errors) {
        return Object.fromEntries(Object.entries(errors).filter(([k, v]) => !k.endsWith("Asterisk") && v).map(([k, v]) => [k, [v]]))
    }

    // Scrolls to the first field that has an error, so it isn't missed on a
    // long form or a scrolling modal.
    static focusFirstError(errors) {
        const first = Object.keys(errors).find((k) => !k.endsWith("Asterisk") && errors[k])
        if (!first) return
        requestAnimationFrame(() => {
            const el = document.querySelector(`[name="${first}"], #${CSS.escape(first)}`)
            el?.scrollIntoView({ behavior: "smooth", block: "center" })
            if (el && typeof el.focus === "function") el.focus({ preventScroll: true })
        })
    }

    // A reason / message box: required, at least `min` characters. "" when fine.
    static reason(value, label = "Reason", min = 5) {
        return Validator.check({ v: value }, { v: [Validator.required(label), Validator.minLength(min, label)] }).v ?? ""
    }

    // Optional date range: both empty is fine, one alone or backwards isn't. "" when fine.
    static optionalDateRange(from, to) {
        if (from && !to) return "Choose an end date too."
        if (!from && to) return "Choose a start date too."
        if (from && to && new Date(to) < new Date(from)) return "The end date can't be before the start date."
        return ""
    }

    // ==========================================================================
    // Sign-in and passwords
    // ==========================================================================
    static login(data) {
        return Validator.check(data, { username: [Validator.required("Username")], password: [Validator.required("Password")] })
    }

    static recoveryUsername(username) {
        return username.trim() ? "" : "Username / User I.D is required"
    }

    // Forgot password, new password step: { new_password, password_confirmation }, one message at a time.
    static passwordReset(data, commonPasswordList) {
        const { new_password: pass, password_confirmation: confirm } = data
        const out = (newPass = "", confirmation = "") => ({ new_password: newPass, password_confirmation: confirmation })
        if (pass === "" && confirm === "") return out("New Password is required", "Password Confirmation is required")
        if (pass === "") return out("New Password is required")
        if (confirm === "") return out("", "Password Confirmation is required")
        if (pass.length < 8) return out("Password must be at least 8 characters.")
        if (pass !== confirm) return out("", "Passwords do not match. Please try again.")
        if (commonPasswordList?.has(pass.toLowerCase())) return out("This password is too common. Please choose a stronger one.")
        return out()
    }

    // Account Settings, account info: username always, email for the System Admin.
    static accountInfo(data, isAdmin) {
        const err = {}
        if (!data.username?.trim()) put(err, "username", "Username is required")
        else if (data.username.length < 8) err.username = "Username must be at least 8 characters long"
        else if (!LETTERS_AND_DIGITS.test(data.username)) err.username = "Username must contain both letters and numbers"
        if (isAdmin) {
            if (!data.email?.trim()) put(err, "email", "Email is required")
            else if (!EMAIL.test(data.email)) err.email = "Please enter a valid email address"
        }
        return err
    }

    // Account Settings, password: the new password follows validatePassword()'s rules.
    // account: the account being changed (its names, username, email and ID number).
    static accountPassword(data, { needsCurrent, account, commonPasswordList }) {
        const err = {}
        if (needsCurrent && !data.current_password) put(err, "current_password", "Current Password is required")
        if (!data.password) {
            put(err, "password", "Password is required")
        } else {
            new Validator({}, account.role).validatePassword({
                ...data,
                first_name: account.profile?.first_name,
                middle_name: account.profile?.middle_name,
                last_name: account.profile?.last_name,
                username: account.username,
                email: account.email,
                user_id: account.id_number,
            }, err, commonPasswordList)
            if (err.password) err.passwordAsterisk = true
        }
        if (!data.password_confirmation) put(err, "password_confirmation", "Password Confirmation is required")
        if (data.password && data.password_confirmation && data.password !== data.password_confirmation) put(err, "password", "Password doesn't match")
        return err
    }

    static loginPortalPassword(data) {
        return Validator.check(data, {
            password: [Validator.required("Password"), Validator.minLength(8, "Password")],
            password_confirmation: [Validator.required("Password confirmation"), (v, d) => (v && v !== d.password ? "Passwords do not match." : null)],
        })
    }

    static mailConfig(data) {
        return Validator.check(data, {
            username: [Validator.requiredIf((d) => !!d.password, "SMTP username"), Validator.maxLength(255, "SMTP username")],
            password: [Validator.maxLength(255, "SMTP password")],
        })
    }

    static testEmail(value) {
        return Validator.check({ v: value }, { v: [Validator.required("Email address"), Validator.email()] }).v ?? ""
    }

    // The rules every new password follows. Writes errorMessage.password ("" when fine).
    validatePassword(field, errorMessage, commonPasswordList) {
        const password = field.password || ""
        const lower = password.toLowerCase()
        const hasName = NAME_KEYS.some((k) => field[k] && new RegExp(field[k].replace(/[^a-z0-9]/gi, ""), "i").test(lower))
        const hasAccountDetail = ["username", "user_id", "email"].some((k) => field[k] && lower.includes(String(field[k]).toLowerCase()))

        if (!password.trim()) errorMessage.password = "Password is required"
        else if (password.length < 8) errorMessage.password = "Password must be at least 8 characters"
        else if (commonPasswordList?.has(password)) errorMessage.password = "This password is too common. Try another one"
        else if (hasName) errorMessage.password = "Password must not contain your name"
        else if (hasAccountDetail) errorMessage.password = "Password must not contain your username, user ID or email"
        else if (!/[0-9]/.test(password)) errorMessage.password = "Password must contain at least one number"
        else if (!/[A-Z]/.test(password)) errorMessage.password = "Password must contain at least one uppercase letter"
        else if (!/[a-z]/.test(password)) errorMessage.password = "Password must contain at least one lowercase letter"
        else if (!/[!@#$%^&*_\-+=<>?]/.test(password)) errorMessage.password = "Password must contain one or more special characters (except [],{},/\\ and ())"
        else errorMessage.password = ""
    }

    // ==========================================================================
    // Accounts and profiles (instance methods: new Validator(field, role))
    // ==========================================================================
    validateRegistrationForm() {
        const f = this.field
        const err = { user_type: f.user_type ? "" : "No user role selected" }

        for (const key of NAME_KEYS) {
            const label = toTitleCase(key.replace("_", " "))
            if (!need(err, f, key, label)) err[key] = LETTERS.test(f[key]) ? "" : `${label} must only contain letters`
        }
        if (!need(err, f, "user_id", "User ID")) {
            err.user_id = f.user_id.length < 6 ? "User ID must be at least 6 characters long"
                : !LETTERS_AND_DIGITS.test(f.user_id) ? "User ID must contain both letters and numbers" : ""
        }
        // Username: generated by the server (registration_username()).
        if (!need(err, f, "email", "Email")) err.email = EMAIL.test(f.email) ? "" : "Invalid email format"

        this.checkUserTypeUniqueFields(f, err)
        err.all_fields = this.checkUserTypeFieldEmpty(f, err) ? true : ""
        return err
    }

    checkUserTypeUniqueFields(f, err) {
        const fields = {
            student: { program: "Program", year_level: "Year Level" },
            faculty: { program: "Program" },
            program_head: { program: "Program" },
            staff: { position: "Position" },
        }[this.role] ?? {}
        for (const [key, label] of Object.entries(fields)) err[key] = f[key] == "" ? `${label} is not selected` : ""
    }

    // A form left completely empty: mark every field instead of listing messages.
    checkUserTypeFieldEmpty(f, err) {
        const keys = ["user_type", ...NAME_KEYS, "user_id", "email", ...(this.role === "student" ? ["program", "year_level"] : [])]
        const allBlank = keys.every((k) => f[k] === undefined || f[k] === null || String(f[k]).trim() === "")
        if (allBlank) keys.forEach((k) => { err[`${k}Asterisk`] = true; err[k] = "" })
        return allBlank
    }

    validateFamilyRegistrationForm() {
        const err = {}
        const parents = this.field.parents || []
        const filled = ["first_name", "middle_name", "last_name", "sex", "parent_role", "work_occupation"]
        const empty = (v) => v == null || v === ""

        // No parent, or only rows with nothing but the user type picked.
        if (parents.length === 0 || parents.every((p) => !p || filled.every((k) => empty(p[k])))) {
            err.parent = "Parents / Guardian is required"
            return err
        }

        const combos = [["father", "mother"], ["father", "guardian"], ["mother", "guardian"], ["mother"], ["father"], ["guardian"]]
        const valid = combos.some((c) => areObjectArraysEqualByKey(parents, c.map((r) => ({ parent_role: r })), "parent_role"))
        err.parent_role = valid ? "" : "Please make sure to include at least one Father, Mother, or Guardian"

        parents.forEach((p, i) => {
            for (const [key, label] of [["first_name", "First Name"], ["middle_name", "Middle Name"], ["last_name", "Last Name"], ["work_occupation", "Work Occupation"]]) {
                const missing = p[key] == null || p[key] == ""
                err[key + i] = missing ? `${label} is required` : ""
                err[`${key}Asterisk${i}`] = missing ? true : ""
            }
            err["parent_role" + i] = p.parent_role == null || p.parent_role == "" ? "Parent role is not selected" : ""
        })
        return err
    }

    // userType: who is editing ("prefect" / "itrc" may change the program and ID).
    validateUpdateProfileForm(userType) {
        const f = this.field
        const err = {}

        // Middle name is optional. Real names: letters (ñ, é, ...), spaces,
        // apostrophes, hyphens and periods (O'Reilly, Dela Cruz-Santos, Ma.).
        for (const key of NAME_KEYS) {
            const label = toTitleCase(key.replace("_", " "))
            if (key === "middle_name" && !f[key]?.trim()) { put(err, key, ""); continue }
            if (!need(err, f, key, label)) err[key] = /^[\p{L}\s.'’-]+$/u.test(f[key]) ? "" : `${label} must only contain letters`
        }

        const canEditProgram = userType === "prefect" || userType === "itrc"
        const phone = f.phone_number?.toString().trim()
        const picture = () => { err.profile_picture = f.profile_picture ? "" : "Profile Picture is required" }
        // Students and parents: an email or a contact number (11 digits).
        const emailOrPhone = () => {
            const missing = !f.email?.trim() && !f.phone_number?.trim()
            err.contact = missing ? "Email or Contact Number must be filled up" : ""
            err.emailAsterisk = err.contact_numberAsterisk = missing ? true : ""
            err.contact_number = f.phone_number?.trim() && f.phone_number.length !== 11 ? "Contact Number must be 11 digits" : ""
        }

        // System Admin: only the contact number's format.
        if (this.role === "super_admin") {
            return { contact_number: phone && phone.length !== 11 ? "Contact Number must be 11 digits" : "", contact_numberAsterisk: "" }
        }

        if (this.role === "student") {
            picture()
            emailOrPhone()
            needAll(err, f, { ...PERSONAL, ...ADDRESS, ...(userType === "itrc" ? { new_user_id: "User I.D" } : {}) })

            // Education background. College year graduated is optional.
            const edu = f.data || {}
            const program = canEditProgram ? { college_program: "Program" } : {}
            needAll(err, edu, {
                sh_school_name: "School Name", sh_school_address: "School Address", sh_year_graduated: "Year Graduated",
                college_school_name: "School Name", college_school_address: "School Address", ...program,
            })
            put(err, "college_year_graduated", "")

            // Transferee: all or nothing.
            const transferee = {
                tr_college_school_name: "School Name", tr_college_school_address: "School Address", tr_college_year_graduated: "Year Graduated",
                year_level: "Year Level", date_last_attended: "Date Last Attended", ...(canEditProgram ? { tr_college_program: "Program" } : {}),
            }
            const started = Object.keys(transferee).some((k) => edu[k] !== null && edu[k] !== undefined && String(edu[k]).trim() !== "")
            if (started) needAll(err, edu, transferee)
            else Object.keys(transferee).forEach((k) => put(err, k, ""))
            return err
        }

        // Teaching and non-teaching staff: picture, sex, contact number and address.
        if (["program_head", "faculty", "non_teaching_staff"].includes(this.role)) {
            picture()
            put(err, "sex", f.sex ? "" : "Sex is required")
            put(err, "contact_number", !f.phone_number?.trim() ? "Contact Number is required"
                : f.phone_number.length !== 11 ? "Contact Number must be 11 digits" : "")
            needAll(err, f, ADDRESS)
            return err
        }

        needAll(err, f, { ...PERSONAL, ...ADDRESS, ...(userType === "itrc" ? { user_id: "User I.D" } : {}) })
        picture()
        emailOrPhone()
        return err
    }

    validateUserAccount(commonPasswordList) {
        const f = this.field
        const err = {}

        // A parent's names: letters only.
        for (const key of NAME_KEYS) {
            const isParent = f.user_type == "parent"
            err[`${key}Asterisk`] = isParent && f[key] == "" ? true : ""
            err[key] = isParent && !LETTERS.test(f[key]) ? `${toTitleCase(key)} must only contain letters` : ""
        }
        put(err, "username", f.username == null || f.username == "" ? "Username is required" : "")
        err.passwordAsterisk = f.password == "" ? true : ""
        this.validatePassword(f, err, commonPasswordList)
        return err
    }

    // ==========================================================================
    // Forms
    // ==========================================================================
    static enrollment(form) {
        return Validator.check(form, { program_id: [Validator.required("Program")], year_level: [Validator.required("Year level")] })
    }

    static parentRegistration(data) {
        const { required, requiredIf, personName, maxLength, minLength, email, phMobile } = Validator
        const errors = Validator.check(data, {
            first_name: [required("First name"), personName(), maxLength(50, "First name")],
            middle_name: [personName(), maxLength(50, "Middle name")],
            last_name: [required("Last name"), personName(), maxLength(50, "Last name")],
            parent_role: [required("Relationship")],
            sex: [requiredIf((d) => d.parent_role === "guardian", "Sex")],
            email: [required("Email"), email()],
            contact_number: [required("Contact number"), phMobile()],
            reason: [required("Reason"), minLength(10, "Reason")],
        })
        if (!data.agree_terms) errors.agree_terms = "You must agree to the Terms and Conditions to register."

        // A parent links to at least one child, unless they have a family code.
        const children = data.children || []
        if (children.length === 0 && !data.family_code.trim()) errors.children = "Add at least one child, or enter your family code."
        children.forEach((child, i) => {
            const childErrors = Validator.check(child, {
                student_id: [required("Student ID")],
                first_name: [required("First name"), personName()],
                middle_name: [personName()],
                last_name: [required("Last name"), personName()],
                sex: [required("Sex")],
                program: [required("Program")],
                year_level: [required("Year level")],
            })
            for (const [k, v] of Object.entries(childErrors)) errors[`child_${i}_${k}`] = v
        })
        return errors
    }

    // Changing an account's role. fields: { key: label } the new role needs.
    static changeRole({ role, needsNewId, idChanged, fields, details }) {
        const errs = {}
        if (!role) errs.role = "Please select the new role."
        if (role && needsNewId && !idChanged) errs.id_number = "Enter the new ID number for this role. The current one is kept in the ID history."
        for (const [key, label] of Object.entries(fields)) if (!details[key]) errs[key] = `${label} is required.`
        return errs
    }

    // ---------- complaints and violations ----------

    // needsComplainant: the prefect filing for someone who hasn't been picked or named.
    static complaint({ needsComplainant = false, subjectCount, sameAsComplainant = false, description }) {
        return {
            complainant: needsComplainant ? "This is Required. Please Specify the Complainant" : "",
            subject: subjectCount === 0 ? "This Is Required. Please Specify The Subject Of Complaint"
                : sameAsComplainant ? "Complainant Cannot Be The Subject" : "",
            // The incident is optional: a complaint goes through as long as it has a reason.
            incident: "",
            reason: Validator.isBlank(description) ? "This Is Required. Please State Your Reason To Complaint" : "",
        }
    }

    // Resolving a complaint, one summary per student.
    static violationSummaries(subjects) {
        return subjects.some((s) => Validator.isBlank(s.violation_summary)) ? { remark: "Summary is required for all entries.", remarkAsterisk: true } : {}
    }

    // Resolving a complaint: one shared summary, then each student's offenses.
    static violationResolution(summary, subjects) {
        const errors = {}
        if (Validator.isBlank(summary)) errors.summary = "Summary of the incident is required."
        subjects.forEach((student, s) => {
            const picked = student.offenses.map((o) => o.violation)
            if (picked.includes("none") && picked.length > 1) errors[`none_${s}`] = "'No Violation Committed' cannot be selected together with other violations."
            if (picked.some((v, i) => v !== "none" && picked.indexOf(v) !== i)) errors[`duplicate_${s}`] = "Duplicate violations detected. Each violation must be unique."
            student.offenses.forEach((off, o) => {
                if (!off.violation) errors[`offense_${s}_${o}`] = "Please select a violation."
                if (off.violation === "others" && !off.other_offense_description.trim()) errors[`other_${s}_${o}`] = "Other violation description is required."
            })
        })
        return errors
    }

    // A violation in Violation Management. penalties: its occurrences' penalty slots.
    static violation(data, penalties) {
        const err = {}
        put(err, "violation_name", data.violation_name.trim() ? "" : "Violation name is required.")
        put(err, "offense_status", data.offense_status === "0" || data.offense_status === "1" ? "" : "Please select Major or Minor.")
        Object.assign(err, Validator.keywords(data.keywords))
        // An occurrence with several slots needs at least one penalty.
        const emptyOccurrence = penalties.some((occ) => occ.list.length > 1 && occ.list.every((p) => p.penalty_id.trim() === ""))
        err.penalties = emptyOccurrence ? "Please select at least ONE penalty for occurrences with multiple slots." : ""
        return err
    }

    static keywords(list) {
        const missing = !list || list.length === 0
        return { keywords: missing ? "Please add at least one keyword." : "", keywordsAsterisk: missing }
    }

    // A penalty: reference number like 6 or 1.4, not already used; a name up to 191 characters.
    static penalty(data, list) {
        const err = {}
        const ref = data.ref_number.trim()
        if (!ref) err.ref_number = "Reference number is required."
        else if (!/^\d{1,3}(\.\d)?$/.test(ref)) err.ref_number = "Use a number like 6 or 1.4."
        else if ((list ?? []).some((p) => Number(p.ref_number) === Number(ref))) err.ref_number = "That reference number is already used."
        const name = data.description.trim()
        if (!name) err.description = "Penalty name is required."
        else if (name.length > 191) err.description = "Penalty name must be at most 191 characters."
        return err
    }

    static riskNotify(notifyFaculty, notifyProgramHead) {
        return notifyFaculty || notifyProgramHead ? "" : "You must choose at least one option to notify."
    }

    // ---------- absent forms, gate passes, referrals, appointments ----------

    // Absent form. reasonKey: the field the reason error shows under.
    // pictures (new forms only): at least one image, each up to 2 MB.
    static absentForm({ date_from, date_to, reasons, other_reason, pictures, needsStudent = false }, reasonKey = "absent_form_reason") {
        const errors = {}
        if (needsStudent) errors.student = "Please select a student."
        if (!date_from) errors.date_from = "Date From is required."
        if (!date_to) errors.date_to = "Date To is required."
        if (date_from && date_to && new Date(date_to) < new Date(date_from)) errors.date_to = "Date To must be later than or equal to Date From."
        if (reasons.length === 0 && Validator.isBlank(other_reason)) errors[reasonKey] = "Please select or type a reason."
        if (pictures) {
            if (pictures.length === 0) errors.pic_evidence = "Please upload at least one picture."
            else if (pictures.some((file) => !file.type.startsWith("image/") || file.size / (1024 * 1024) > 2)) errors.pic_evidence = "Each file must be an image and not exceed 2MB."
        }
        return errors
    }

    // The prefect issuing a gate pass.
    static gatePassIssue(data) {
        const e = {}
        if (!data.user_id) e.user_id = "Please select a student."
        if (!data.reason || stripTags(data.reason).trim() === "") e.reason = "Reason is required."
        if (!data.expiration_date) e.expiration_date = "Please select an expiration date."
        else if (new Date(data.expiration_date) <= new Date()) e.expiration_date = "Expiration date cannot be in the past."
        if (data.allow_to.length === 0) e.allow_to = "Please select at least one option."
        return e
    }

    // Approving a gate pass request. minDate: the earliest allowed expiration.
    static gatePassApproval(data, minDate) {
        const errors = {}
        if (!data.expiration_date || data.expiration_date.trim() === "") put(errors, "expiration_date", "Please select an expiration date.")
        else if (new Date(data.expiration_date) < minDate) put(errors, "expiration_date", "Expiration date cannot be in the past.")
        if (!Array.isArray(data.allow_to) || data.allow_to.length === 0) put(errors, "allow_to", "Please select at least one option.")
        return errors
    }

    static referralStudents(students) {
        return students.length === 0 ? "Please select at least one student to refer." : ""
    }

    // needsTime: the prefect sets a time. needsPerson: nobody picked yet.
    static appointment(appoint, { isCancel, needsTime, needsPerson, today }) {
        const { required, dateNotBefore, minLength } = Validator
        const found = Validator.check(appoint, {
            date_appoint: isCancel ? [] : [required("Date"), dateNotBefore(today, "You can't schedule an appointment for a past date.")],
            time_start: needsTime ? [
                required("Time"),
                (v) => (v && (v < "07:00" || v > "16:30") ? "Appointments can only be between 7:00 AM and 4:30 PM." : null),
            ] : [],
            reason: [required("Reason"), minLength(5, "Reason")],
        })
        if (needsPerson) found.person = "Select a student or parent."
        return found
    }

    // The prefect calling a student in.
    static callIn(data, { needsStudent }) {
        const found = Validator.check(data, { call_in_reason: [Validator.required("Message"), Validator.minLength(5, "Message")] })
        if (needsStudent) found.student = "Select the student to call in."
        return found
    }

    static note(data) {
        return Validator.check(data, { note: [Validator.maxLength(1000, "Remarks")] })
    }

    // ---------- reports and archive ----------
    static actionLogReport(data, { needsUser }) {
        const found = Validator.check(data, {
            report_type: [Validator.required("Action type")],
            school_year_id: [Validator.requiredIf((d) => d.filter_by === "school_year", "School year")],
        })
        if (needsUser) found.user = "Select a user, or untick Individual."
        const range = Validator.optionalDateRange(data.date_from, data.date_to)
        if (range) found.date_range = range
        return found
    }

    // The prefect's report generator. The Analytical Report has no program choice.
    static reportGenerator(data, { filterBy, needsStudent }) {
        const found = Validator.check(data, {
            program: [Validator.requiredIf((d) => !d.individual && d.type !== "analytics", "Program")],
            school_year: [Validator.requiredIf(() => filterBy === "school_year", "School year")],
            report_name: [Validator.maxLength(100, "Filter name")],
        })
        if (needsStudent) found.student = "Select a student, or untick Individual Student Report."
        const range = filterBy === "date" ? Validator.optionalDateRange(data.date_from, data.date_to) : ""
        if (range) found.date_range = range
        return found
    }

    // System Admin report filters. "" when fine.
    static reportFilter({ needsPerson, personLabel, individualLabel, date_from, date_to }) {
        if (needsPerson) return `Select a ${personLabel}, or untick ${individualLabel}.`
        if (date_from && date_to && date_to < date_from) return "The end date is before the start date."
        return ""
    }

    // Archive download. "" when fine.
    static archiveDownload({ individual, person, type, sides, school_year, semester }) {
        if (individual && !person) return "Select a person, or untick Individual."
        if (person?.role === "student" && type === "complaint" && sides.length === 0) return "Tick As Complainant, As Subject, or both."
        if (!school_year && !semester && !person) return "Choose a school year, a semester, or both."
        return ""
    }

    // ---------- system settings ----------
    static semesterDates(start, end) {
        if (!start || !end) return "Both dates are required."
        if (end < start) return "End date must be after the start date."
        return ""
    }

    static scheduleMaintenance(startsAt, message) {
        const errs = {}
        if (!startsAt) errs.starts_at = "Please pick a date and time."
        else if (new Date(startsAt) <= new Date()) errs.starts_at = "Pick a time in the future."
        if (Validator.isBlank(message)) errs.message = "A message is required."
        return errs
    }

    static program(data) {
        const err = { code: "", codeAsterisk: false, name: "", nameAsterisk: false, color: "", colorAsterisk: false }
        if (!data.code.trim()) Object.assign(err, { code: "Program code is required.", codeAsterisk: true })
        if (!data.name.trim()) Object.assign(err, { name: "Program name is required.", nameAsterisk: true })
        if (!data.color || !/^#([0-9A-F]{3}){1,2}$/i.test(data.color)) Object.assign(err, { color: "Invalid color code.", colorAsterisk: true })
        return err
    }

    static roleName(label) {
        return label.trim() ? "" : "Role name is required."
    }

    // A staff position name: required, up to 50 characters, not already used. "" when fine.
    static positionName(name, positions, exceptId = null) {
        const n = name.trim()
        if (!n) return "Position name is required."
        if (n.length > 50) return "Position name must be at most 50 characters."
        if ((positions ?? []).some((p) => p.id !== exceptId && String(p.name).trim().toLowerCase() === n.toLowerCase())) return "That position already exists."
        return ""
    }

    static familyToJoin(family) {
        return family?.id || family?.family_id ? "" : "Please select a family group to join."
    }

    // A prefect's available hours on one day, same rules as the server:
    // both times set, end after start, no overlaps. null when fine.
    static availabilityDay(ranges) {
        for (const r of ranges) {
            if (!r.start_time || !r.end_time) return "Set both a start and an end time."
            if (r.end_time <= r.start_time) return "The end time must be later than the start time."
        }
        const sorted = [...ranges].sort((a, b) => a.start_time.localeCompare(b.start_time))
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].start_time < sorted[i - 1].end_time) return "Time ranges must not overlap."
        }
        return null
    }

    // ---------- CSV uploads ----------
    static isCsv(file) {
        return ["text/csv", "application/vnd.ms-excel"].includes(file.type) || file.name.toLowerCase().endsWith(".csv")
    }

    // An account CSV: a CSV with the expected name. "" when fine.
    static csvFile(file, type) {
        if (!Validator.isCsv(file)) return "Invalid file type. Please upload a CSV file."
        const expected = type === "student" ? "enrolled-pczc-students" : type === "faculty" ? "faculty-pczc" : "staff"
        if (!/^(enrolled-pczc-students|faculty-pczc|staff)$/.test(file.name.toLowerCase().replace(".csv", ""))) {
            return `Invalid file name format. Expected pattern: ${expected}.csv`
        }
        return ""
    }

    // The file's contents: exact columns, at least one row, known programs.
    // Returns { message, hasExactOrder, hasRows, invalidPrograms }.
    static csvContent(text, type, programs) {
        const common = ["id", "first_name", "middle_name", "last_name", "suffix", "sex", "email"]
        const columns = {
            student: [...common, "program", "year_level"],
            faculty: [...common, "program"],
            administrative: ["id", "first_name", "middle_name", "last_name", "sex", "email", "program"],
            staff: [...common, "position"],
        }[type]

        const rows = text.trim().split("\n").map((row) => row.split(","))
        const headers = rows[0].map((h) => h.toLowerCase().trim())
        const hasExactOrder = headers.length === columns.length && headers.every((h, i) => h === columns[i])
        const hasRows = rows.length - 1 >= 1

        // Students and faculty name their program by code; others by id.
        const byCode = type === "student" || type === "faculty"
        const invalidPrograms = []
        const at = headers.indexOf("program")
        if (at !== -1) {
            const known = programs.map((p) => (byCode ? p.code.toLowerCase() : String(p.id)))
            for (let i = 1; i < rows.length; i++) {
                const value = rows[i][at]?.trim()
                if (value && !known.includes(byCode ? value.toLowerCase() : value)) invalidPrograms.push({ row: i + 1, value })
            }
        }

        const what = byCode ? "names" : "IDs"
        const message = !hasExactOrder ? `Invalid column order. Expected: [${columns.join(", ")}]. Found: [${headers.join(", ")}]`
            : !hasRows ? "CSV must contain at least 1 data row."
            : invalidPrograms.length ? `Invalid program ${what} found at rows: ${invalidPrograms.map((r) => `${r.row} (${r.value})`).join(", ")}. `
                + `Allowed ${what}:\n` + programs.map((p) => `${byCode ? p.code : p.id} - ${p.name}`).join("\n")
            : ""
        return { message, hasExactOrder, hasRows, invalidPrograms }
    }
}
