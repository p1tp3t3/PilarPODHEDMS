import { areObjectArraysEqualByKey, toTitleCase, validateField } from "../function"

export class Validator {
    constructor(field, role) {
        this.field = field
        this.role = role
    }

    validateRegistrationForm(commonPasswordList) {
        const field = this.field;
        const errorMessage = {};

        // 🔹 Helper: Required field check
        const required = (key, label) => {
            if (!field[key]?.trim()) {
                errorMessage[key] = `${label} is required`;
                errorMessage[`${key}Asterisk`] = true;
                return true;
            } else {
                errorMessage[`${key}Asterisk`] = '';
                return false;
            }
        };

        // 🔹 User type
        if (!field.user_type) {
            errorMessage.user_type = 'No user role selected';
        } else {
            errorMessage.user_type = '';
        }

        // 🔹 Name fields (required + letter validation)
        ['first_name', 'middle_name', 'last_name'].forEach(nameKey => {
            const label = toTitleCase(nameKey.replace('_', ' '));
            if (required(nameKey, label)) return;

            if (!/^[A-Za-z\s]+$/.test(field[nameKey])) {
                errorMessage[nameKey] = `${label} must only contain letters`;
            } else {
                errorMessage[nameKey] = '';
            }
        });

        // 🔹 User ID Validation
        if (required('user_id', 'User ID')) {
            errorMessage.user_id = 'User ID is required';
        } else if (field.user_id.length < 6) {
            errorMessage.user_id = 'User ID must be at least 6 characters long';
        } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(field.user_id)) {
            errorMessage.user_id = 'User ID must contain both letters and numbers';
        } else {
            errorMessage.user_id = '';
        }

        // 🔹 Username Validation
        if (required('username', 'Username')) {
            errorMessage.username = 'Username is required';
        } else if (field.username.length < 8) {
            errorMessage.username = 'Username must be at least 8 characters long';
        } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(field.username)) {
            errorMessage.username = 'Username must contain both letters and numbers';
        } else {
            errorMessage.username = '';
        }


        // 🔹 Email
        if (required('email', 'Email')) {
            errorMessage.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.email)) {
            errorMessage.email = 'Invalid email format';
        } else {
            errorMessage.email = '';
        }

        // 🔹 Password
        if (required('password', 'Password')) {
            errorMessage.password = 'Password is required';
        } else {
            this.validatePassword(field, errorMessage, commonPasswordList);
        }

        // 🔹 Check type-specific fields
        this.checkUserTypeUniqueFields(field, errorMessage);

        // 🔹 Check if any type-specific field empty
        if (this.checkUserTypeFieldEmpty(field, errorMessage)) {
            errorMessage.all_fields = true;
        } else {
            errorMessage.all_fields = '';
        }

        return errorMessage;
    }

    validateFamilyRegistrationForm() {
        let errorMessage = {}
        const field = this.field
        const parents = this.field.parents || [];

        // Check if parents array is empty or only contains "blank" entries
        const isBlank = parents.length === 0 || parents.every(p => {
            if (!p) return true;

            // Extract user_type
            const { user_type, first_name, middle_name, last_name, sex, parent_role, work_occupation } = p;

            // Case 1: all fields (including user_type) are empty/null
            const allEmpty = [user_type, first_name, middle_name, last_name, sex, parent_role, work_occupation]
            .every(val => val == null || val === '');

            // Case 2: user_type is filled but all *other* fields are empty/null
            const onlyUserTypeFilled =
            (user_type != null && user_type !== '') &&
            [first_name, middle_name, last_name, sex, parent_role, work_occupation]
                .every(val => val == null || val === '');

            return allEmpty || onlyUserTypeFilled;
        });
        
        if(isBlank) {
            errorMessage.parent = 'Parents / Guardian is required'
        }else {
            const b = [
                [ { parent_role: 'father' }, { parent_role: 'mother' } ],
                [ { parent_role: 'father' }, { parent_role: 'guardian' } ],
                [ { parent_role: 'mother' }, { parent_role: 'guardian' } ],
                [ { parent_role: 'mother' } ],
                [ { parent_role: 'father' } ],
                [ { parent_role: 'guardian' } ],
            ];

            const isValidCombination = b.some(validCombo => 
                areObjectArraysEqualByKey(parents, validCombo, 'parent_role')
            );

            if (isValidCombination) {
                errorMessage.parent_role = '';
            } else {
                errorMessage.parent_role = 'Please make sure to include at least one Father, Mother, or Guardian';
            }
            field['parents'].forEach((e, i) => {
                if(e['first_name'] == null || e['first_name'] == '') {
                    errorMessage['first_name' + i] = 'First Name is required'
                    errorMessage['first_nameAsterisk' + i] = true
                }else {
                    errorMessage['first_name' + i] = ''
                    errorMessage['first_nameAsterisk' + i] = ''
                }
                if(e['middle_name'] == null || e['middle_name'] == '') {
                    errorMessage['middle_name' + i] = 'Middle Name is required'
                    errorMessage['middle_nameAsterisk' + i] = true
                }else {
                    errorMessage['middle_name' + i] = ''
                    errorMessage['middle_nameAsterisk' + i] = ''
                }
                if(e['last_name'] == null || e['last_name'] == '') {
                    errorMessage['last_name' + i] = 'Last Name is required'
                    errorMessage['last_nameAsterisk' + i] = true
                }else {
                    errorMessage['last_name' + i] = ''
                    errorMessage['last_nameAsterisk' + i] = ''
                }
                if(e['parent_role'] == null || e['parent_role'] == '') {
                    errorMessage['parent_role' + i] = 'Parent role is not selected'
                }else {
                    errorMessage['parent_role' + i] = ''
                }
                if(e['work_occupation'] == null || e['work_occupation'] == '') {
                    errorMessage['work_occupation' + i] = 'Work Occupation is required'
                    errorMessage['work_occupationAsterisk' + i] = true
                }else {
                    errorMessage['work_occupation' + i] = ''
                    errorMessage['work_occupationAsterisk' + i] = ''
                }
            })
        }

        return errorMessage
    }

    checkUserTypeUniqueFields(f, err) {
        if(this.role == 'student') {
            if(f['program'] == '') {
                err.program = 'Program is not selected'
            }else {
                err.program = ''
            }if(f['year_level'] == '') {
                err.year_level = 'Year Level is not selected'
            }else {
                err.year_level = ''
            }if(f['school_year_id'] == '') {
                err.school_year_id = 'School Year is not selected'
            }else {
                err.school_year_id = ''
            }

        }if(this.role == 'faculty') {
            if(f['program'] == '') {
                err.program = 'Program is not selected'
            }else {
                err.program = ''
            }
        }if(this.role == 'program_head') {
            if(f['program'] == '') {
                err.program = 'Program is not selected'
            }else {
                err.program = ''
            }
        }if(this.role == 'staff') {
            if(f['position'] == '') {
                err.position = 'Position is not selected'
            }else {
                err.position = ''
            }
        }
    }

    checkUserTypeFieldEmpty(f, err) {
        const d = ['user_type', 'first_name', 'middle_name', 'last_name', 'user_id', 'username', 'email', 'password']
                
        switch(this.role) {
            case 'student':
                d.push('program')
                d.push('year_level')
                const blank = d.every(field => {
                    const value = f[field];
                    return value === undefined || value === null || String(value).trim() === "";
                });
                if(blank) {
                    d.forEach((e, i) => {
                        err[`${e}Asterisk`] = true
                        err[e]  =  ''
                    })
                }
                return blank
            default:
                const allBlank = d.every(field => {
                    const value = f[field];
                    return value === undefined || value === null || String(value).trim() === "";
                });
                if(allBlank) {
                    d.forEach((e, i) => {
                        err[`${e}Asterisk`] = true
                        err[e]  =  ''
                    })
                }
                return allBlank
        }
    }

    validateUpdateProfileForm(userType) {
    let errorMessage = {};
    const field = this.field;

    const required = (key, label) => {
        if (!field[key]?.trim()) {
            errorMessage[key] = `${label} is required`;
            errorMessage[`${key}Asterisk`] = true;
            return true;
        } else {
            errorMessage[`${key}Asterisk`] = '';
            return false;
        }
    };

    // ---------- COMMON: NAME FIELDS ----------
    ['first_name', 'middle_name', 'last_name'].forEach(nameKey => {
        const label = toTitleCase(nameKey.replace('_', ' '));
        if (required(nameKey, label)) return;

        if (!/^[A-Za-z\s]+$/.test(field[nameKey])) {
            errorMessage[nameKey] = `${label} must only contain letters`;
        } else {
            errorMessage[nameKey] = '';
        }
    });

    const canEditProgram = (userType === 'prefect' || userType === 'itrc');

    // ===============================================================
    // ⭐ ITRC CAN ONLY EDIT THEIR OWN PROFILE PICTURE
    // ===============================================================
    const isITRC = (userType === 'itrc');
    const editingOwnAccount = (this.field.user_id === this.user_id); // logged-in user's ID

    if (isITRC && editingOwnAccount) {
        let errorMessage = {};

        // Profile picture is the ONLY required field
        if (!field.profile_picture) {
            errorMessage.profile_picture = 'Profile Picture is required';
        } else {
            errorMessage.profile_picture = '';
        }

        // ⛔ Return immediately — no other validation should run
        return errorMessage;
    }


    // =====================================================================
    //  STUDENT PROFILE VALIDATION
    // =====================================================================
    if (this.role === 'student') {

        // --- Profile Picture (required for students) ---
        if (!field.profile_picture) {
            errorMessage.profile_picture = 'Profile Picture is required';
        } else {
            errorMessage.profile_picture = '';
        }

        // --- Email / Contact (at least one) ---
        const hasEmail = !!field.email?.trim();
        const hasPhone = !!field.phone_number?.trim();

        if (!hasEmail && !hasPhone) {
            errorMessage.contact = 'Email or Contact Number must be filled up';
            errorMessage.emailAsterisk = true;
            errorMessage.contact_numberAsterisk = true;
        } else {
            errorMessage.contact = '';
            errorMessage.emailAsterisk = '';
            errorMessage.contact_numberAsterisk = '';
        }

        if (hasPhone) {
            if (field.phone_number.length !== 11) {
                errorMessage.contact_number = 'Contact Number must be 11 digits';
            } else {
                errorMessage.contact_number = '';
            }
        } else {
            errorMessage.contact_number = '';
        }

        // --- Basic required fields for students ---
        const requiredFields = {
            religion: 'Religion is required',
            citizenship: 'Citizenship is required',
            date_of_birth: 'Date of Birth is required',
            place_of_birth: 'Place of Birth is required',
            current_place: 'Current Place is required',
            current_city: 'Current City is required',
            current_province: 'Current Province is required',
            current_zipcode: 'Current Zipcode is required',
            permanent_place: 'Permanent Place is required',
            permanent_city: 'Permanent City is required',
            permanent_province: 'Permanent Province is required',
            permanent_zipcode: 'Permanent Zipcode is required',
        };

        if (userType === 'itrc') {
            requiredFields.new_user_id = 'User I.D is required';
        }

        Object.keys(requiredFields).forEach((key) => {
            if (!field[key] || field[key].trim() === '') {
                errorMessage[key] = requiredFields[key];
                errorMessage[`${key}Asterisk`] = true;
            } else {
                errorMessage[key] = '';
                errorMessage[`${key}Asterisk`] = '';
            }
        });

        // --- Education Background (students only) ---
        const educationBackground = field.data || {};

        // Senior HS + main college
        const shCollegeFields = {
            sh_school_name: 'School Name is required',
            sh_school_address: 'School Address is required',
            sh_year_graduated: 'Year Graduated is required',
            college_school_name: 'School Name is required',
            college_school_address: 'School Address is required',
            college_year_graduated: 'Year Graduated is required',
        };

        // ✅ Program only editable/required when editor is PREFECT or ADMIN
        if (canEditProgram) {
            shCollegeFields.college_program = 'Program is required';
        }

        Object.keys(shCollegeFields).forEach((key) => {
            if (!educationBackground[key] || String(educationBackground[key]).trim() === '') {
                errorMessage[key] = shCollegeFields[key];
                errorMessage[`${key}Asterisk`] = true;
            } else {
                errorMessage[key] = '';
                errorMessage[`${key}Asterisk`] = '';
            }
        });

        // --- Transferee college fields (optional group) ---
        const collegeFields = {
            tr_college_school_name: 'School Name is required',
            tr_college_school_address: 'School Address is required',
            tr_college_year_graduated: 'Year Graduated is required',
            year_level: 'Year Level is required',
            date_last_attended: 'Date Last Attended is required',
        };

        // ✅ Program for transferee only when prefect/admin
        if (canEditProgram) {
            collegeFields.tr_college_program = 'Program is required';
        }

        const hasCollegeValue = Object.keys(collegeFields).some((key) => {
            const value = educationBackground[key];
            return value !== null && value !== undefined && String(value).trim() !== '';
        });

        if (hasCollegeValue) {
            Object.keys(collegeFields).forEach((key) => {
                if (!educationBackground[key] || String(educationBackground[key]).trim() === '') {
                    errorMessage[key] = collegeFields[key];
                    errorMessage[`${key}Asterisk`] = true;
                } else {
                    errorMessage[key] = '';
                    errorMessage[`${key}Asterisk`] = '';
                }
            });
        } else {
            Object.keys(collegeFields).forEach((key) => {
                errorMessage[key] = '';
                errorMessage[`${key}Asterisk`] = '';
            });
        }

        return errorMessage;
    }

    // =====================================================================
    //  TEACHING / NON-TEACHING STAFF PROFILE VALIDATION — only picture, sex,
    //  contact number, and address are required; religion/citizenship/date
    //  of birth/place of birth are left optional for these roles.
    // =====================================================================
    if (['teaching_staff', 'non_teaching_staff'].includes(this.role)) {
        if (!field.profile_picture) {
            errorMessage.profile_picture = 'Profile Picture is required';
        } else {
            errorMessage.profile_picture = '';
        }

        if (!field.sex) {
            errorMessage.sex = 'Sex is required';
            errorMessage.sexAsterisk = true;
        } else {
            errorMessage.sex = '';
            errorMessage.sexAsterisk = '';
        }

        if (!field.phone_number?.trim()) {
            errorMessage.contact_number = 'Contact Number is required';
            errorMessage.contact_numberAsterisk = true;
        } else if (field.phone_number.length !== 11) {
            errorMessage.contact_number = 'Contact Number must be 11 digits';
            errorMessage.contact_numberAsterisk = true;
        } else {
            errorMessage.contact_number = '';
            errorMessage.contact_numberAsterisk = '';
        }

        const addressFields = {
            current_place: 'Current Place is required',
            current_city: 'Current City is required',
            current_province: 'Current Province is required',
            current_zipcode: 'Current Zipcode is required',
            permanent_place: 'Permanent Place is required',
            permanent_city: 'Permanent City is required',
            permanent_province: 'Permanent Province is required',
            permanent_zipcode: 'Permanent Zipcode is required',
        };

        Object.keys(addressFields).forEach((key) => {
            if (!field[key] || field[key].trim() === '') {
                errorMessage[key] = addressFields[key];
                errorMessage[`${key}Asterisk`] = true;
            } else {
                errorMessage[key] = '';
                errorMessage[`${key}Asterisk`] = '';
            }
        });

        return errorMessage;
    }

    // =====================================================================
    //  NON-STUDENT PROFILE VALIDATION (unchanged)
    // =====================================================================
    const requiredFields = {
        religion: 'Religion is required',
        citizenship: 'Citizenship is required',
        date_of_birth: 'Date of Birth is required',
        place_of_birth: 'Place of Birth is required',
        current_place: 'Current Place is required',
        current_city: 'Current City is required',
        current_province: 'Current Province is required',
        current_zipcode: 'Current Zipcode is required',
        permanent_place: 'Permanent Place is required',
        permanent_city: 'Permanent City is required',
        permanent_province: 'Permanent Province is required',
        permanent_zipcode: 'Permanent Zipcode is required',
    };

    if (userType === 'itrc') {
        requiredFields.user_id = 'User I.D is required';
    }

    if (!field.profile_picture) {
        errorMessage.profile_picture = 'Profile Picture is required';
    } else {
        errorMessage.profile_picture = '';
    }

    const hasEmail = !!field.email?.trim();
    const hasPhone = !!field.phone_number?.trim();

    if (!hasEmail && !hasPhone) {
        errorMessage.contact = 'Email or Contact Number must be filled up';
        errorMessage.emailAsterisk = true;
        errorMessage.contact_numberAsterisk = true;
    } else {
        errorMessage.contact = '';
        errorMessage.emailAsterisk = '';
        errorMessage.contact_numberAsterisk = '';
    }

    if (hasPhone) {
        if (field.phone_number.length !== 11) {
            errorMessage.contact_number = 'Contact Number must be 11 digits';
        } else {
            errorMessage.contact_number = '';
        }
    } else {
        errorMessage.contact_number = '';
    }

    Object.keys(requiredFields).forEach((key) => {
        if (!field[key] || field[key].trim() === '') {
            errorMessage[key] = requiredFields[key];
            errorMessage[`${key}Asterisk`] = true;
        } else {
            errorMessage[key] = '';
            errorMessage[`${key}Asterisk`] = '';
        }
    });

    return errorMessage;
}


    validateUserAccount(commonPasswordList) {
        let errorMessage = {}
        const field = this.field

        if(field['user_type'] == 'parent') {
            if(field['first_name'] == '') {
                errorMessage.first_name = 'First name is required';
                errorMessage.first_nameAsterisk = true
            } else {
                errorMessage.first_nameAsterisk = ''
                errorMessage.first_name = '';
            }if(field['middle_name'] == '') {
                errorMessage.middle_name = 'Middle name is required';
                errorMessage.middle_nameAsterisk = true
            } else {
                errorMessage.middle_nameAsterisk = ''
                errorMessage.middle_name = '';
            }if(field['last_name'] == '') {
                errorMessage.last_name = 'Last name is required';
                errorMessage.last_nameAsterisk = true
            } else {
                errorMessage.last_nameAsterisk = ''
                errorMessage.last_name = ''
            }
            if (!(/^[A-Za-z\s]+$/.test(field['first_name']))) {
                errorMessage.first_name = 'First Name must only contain letters'
            }else {
                errorMessage.first_name = ''
            }

            if (!(/^[A-Za-z\s]+$/.test(field['middle_name']))) {
                errorMessage.middle_name = 'Middle Name must only contain letters'
            }else {
                errorMessage.middle_name = ''
            }
            if (!(/^[A-Za-z\s]+$/.test(field['last_name']))) {
                errorMessage.last_name = 'Last Name must only contain letters'
            }else {
                errorMessage.last_name = ''
            }
        }else {
            errorMessage.first_nameAsterisk = ''
            errorMessage.first_name = ''
            errorMessage.middle_nameAsterisk = ''
            errorMessage.middle_name = ''
            errorMessage.last_nameAsterisk = ''
            errorMessage.last_name = ''
        }

        if(field['username'] == null || field['username'] == '') {
            errorMessage['username'] = 'Username is required'
            errorMessage['usernameAsterisk'] = true
        }else {
            errorMessage['username'] = ''
            errorMessage['usernameAsterisk'] = ''
        }

        if(field['username'] == null || field['username'] == '') {
            errorMessage['username'] = 'Username is required'
            errorMessage['usernameAsterisk'] = true
        }else {
            errorMessage['username'] = ''
            errorMessage['usernameAsterisk'] = ''
        }
        
        if(field['password'] == '') {
            errorMessage.password = 'Password is required';
            errorMessage.passwordAsterisk = true
        } else {
            errorMessage.passwordAsterisk = ''
            errorMessage.password = '';
        }
        this.validatePassword(field, errorMessage, commonPasswordList)

        return errorMessage
    }
    validateUserUpdateAccount(commonPasswordList, isSelfUpdate, isAdmin = false) {
        const field = this.field;
        const errorMessage = {};

        // ============================================================
        // Helper: Required field
        // ============================================================
        const required = (key, label, skip = false) => {
            if (skip) return false;

            if (!field[key]?.trim()) {
                errorMessage[key] = `${label} is required`;
                errorMessage[`${key}Asterisk`] = true;
                return true;
            } else {
                errorMessage[`${key}Asterisk`] = "";
                return false;
            }
        };

        // ============================================================
        // ALWAYS REQUIRED (anyone)
        // ============================================================
        required("first_name", "First Name");
        required("middle_name", "Middle Name");
        required("last_name", "Last Name");

        // ============================================================
        // USERNAME VALIDATION (everyone must follow this)
        // ============================================================
        if (required("username", "Username")) {
            errorMessage.username = "Username is required";
        } else if (field.username.length < 8) {
            errorMessage.username = "Username must be at least 8 characters long";
        } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(field.username)) {
            errorMessage.username = "Username must contain both letters and numbers";
        } else {
            errorMessage.username = "";
        }

        // ============================================================
        // EMAIL VALIDATION
        // Admin → validate email
        // Others → REMOVE email validation
        // ============================================================
        if (isAdmin) {
            if (required("email", "Email")) {
                errorMessage.email = "Email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.email)) {
                errorMessage.email = "Please enter a valid email address";
            } else {
                errorMessage.email = "";
            }
        } else {
            // Delete email errors for non-admin
            delete errorMessage.email;
            delete errorMessage.emailAsterisk;
        }

        // ============================================================
        // PASSWORD VALIDATION
        // Admin editing OTHER USERS → no need for current password
        // Admin editing SELF → requires current password
        // Non-admin editing SELF → requires current password
        // ============================================================

        const isChangingPassword =
            field.password.trim() !== "" ||
            field.password_confirmation.trim() !== "" ||
            field.current_password.trim() !== "";

        if (isChangingPassword) {

            // --- CURRENT PASSWORD REQUIREMENT ---
            const mustProvideCurrent =
                (!isAdmin && isSelfUpdate) || // non-admin updating self
                (isAdmin && isSelfUpdate);    // admin updating own account

            if (mustProvideCurrent) {
                if (required("current_password", "Current Password")) {
                    errorMessage.current_password = "Current Password is required";
                }
            } else {
                // Admin editing another user → ignore requirement
                errorMessage.current_password = "";
                errorMessage.current_passwordAsterisk = "";
            }

            // --- NEW PASSWORD ---
            if (required("password", "Password")) {
                errorMessage.password = "Password is required";
            } else {
                this.validatePassword(field, errorMessage, commonPasswordList);
            }

            // --- CONFIRM PASSWORD ---
            if (required("password_confirmation", "Password Confirmation")) {
                errorMessage.password_confirmation =
                    "Password Confirmation is required";
            }

            // --- MATCH CHECK ---
            if (
                field.password &&
                field.password_confirmation &&
                field.password !== field.password_confirmation
            ) {
                errorMessage.password = "Password doesn't match";
                errorMessage.passwordAsterisk = true;
            }
        } else {
            // Not changing password → clear password errors
            delete errorMessage.current_password;
            delete errorMessage.password;
            delete errorMessage.password_confirmation;
            delete errorMessage.current_passwordAsterisk;
            delete errorMessage.passwordAsterisk;
            delete errorMessage.password_confirmationAsterisk;
        }

        return errorMessage;
    }




    validatePassword(field, errorMessage, commonPasswordList) {
        const password = field.password || '';
        const lowerPass = password.toLowerCase();

        if (!password.trim()) {
            errorMessage.password = 'Password is required';
        } else if (password.length < 8) {
            errorMessage.password = 'Password must be at least 8 characters';
        } else if (commonPasswordList?.has(password)) {
            errorMessage.password = 'This password is too common. Try another one';
        } else if (
            // ✅ Only check names if they exist
            (field.first_name && new RegExp(field.first_name.replace(/[^a-z0-9]/gi, ''), 'i').test(lowerPass)) ||
            (field.middle_name && new RegExp(field.middle_name.replace(/[^a-z0-9]/gi, ''), 'i').test(lowerPass)) ||
            (field.last_name && new RegExp(field.last_name.replace(/[^a-z0-9]/gi, ''), 'i').test(lowerPass))
        ) {
            errorMessage.password = 'Password must not contain your name';
        } else if (
            // ✅ Only check username, user ID, or email if they exist
            (field.username && lowerPass.includes(String(field.username).toLowerCase())) ||
            (field.user_id && lowerPass.includes(String(field.user_id).toLowerCase())) ||
            (field.email && lowerPass.includes(String(field.email).toLowerCase()))
        ) {
            errorMessage.password = 'Password must not contain your username, user ID or email';
        } else if (!/[0-9]/.test(password)) {
            errorMessage.password = 'Password must contain at least one number';
        } else if (!/[A-Z]/.test(password)) {
            errorMessage.password = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(password)) {
            errorMessage.password = 'Password must contain at least one lowercase letter';
        } else if (!/[!@#$%^&*_\-+=<>?]/.test(password)) {
            errorMessage.password = 'Password must contain one or more special characters (except [],{},/\\ and ())';
        } else {
            errorMessage.password = '';
        }
    }

    validateComplaint() {
        
    }
}