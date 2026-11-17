import React, { useState, useContext } from "react"
import ProfileSectionWrapper from "@/wrapper/profile-section-wrapper"
import { change, check, checkActiveStatus, getProfilePic, getProgramLogo, getYearLevel, ordinal, readableDate, replaceUnderScoreToSpace, toTitleCase, profileUrl, showUserType } from "@/others/function"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { AccountService } from "@/others/services/account-service"
import AuthContext from "@/context-provider/auth-provider"
import CheckBoxButton from "@/Components/input/checkbox"
import { requestType } from "@/others/list/type-list"
import DropdownField from "@/Components/input/dropdown"
import { User, Home, Users, GraduationCap, MapPin } from "lucide-react"
import { Avatar, Box, Card, CardContent, Chip, List, Stack, Typography } from "@mui/material"
import ProfilePic from "@/Components/other/profile-pic"
import { MuiRow } from "@/Components/list/mui-list-parts"

const About = (props) => {
    const [editEducationBackground, enableEditEducationBackground] = useState('label'),
          [loading, setLoading] = useState(false),
          [btnLabel, setBtnLabel] = useState('save changes')

    // Program heads, faculty and non-teaching staff don't collect date of birth/religion/
    // citizenship/civil status/place of birth (see edit-profile-modal.jsx
    // and Validator.validateUpdateProfileForm) — hide them here too rather
    // than showing "N/A" for fields these roles never ask for.
    const isStaffRole = ['program_head', 'faculty', 'non_teaching_staff'].includes(props.data.user_type)

    // "NON TEACHING STAFF (GUARD)" etc.: a non-teaching staff member's
    // position in parentheses. Program head / faculty are roles themselves.
    const roleSuffix = () => {
        if (props.data.user_type === 'non_teaching_staff') {
            return props.data.unique_att?.position ?? null
        }
        return null
    }

    const clickEditEducationBackground = () => {
        enableEditEducationBackground((editEducationBackground !== 'label') ? 'label' : 'form')
    }
    const handleCheck = (e) => {
        check(e, props.setData, 'bool')
    }
    const showUserAccessibility = () => {
        switch(props.data.user_type) {
            case 'student':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint' ||
                        e.val == 'absent_form' ||
                        e.val == 'gatepass')
                )
            case 'program_head':
            case 'faculty':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint' ||
                        e.val == 'referral')
                )
            case 'parent':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint')
                )
            case 'non_teaching_staff':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint')
                )
            case 'sub_admin':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint' ||
                        e.val == 'referral' ||
                        e.val == 'appointment'))
            default:
                return requestType
        }
    }
    const handleSubmit = (e) => {
        e.preventDefault()
        const data = {
            user_id: props.data2.user_id,
            allow_complaint: props.data2.allow_complaint,
            allow_referral: props.data2.allow_referral,
            allow_absent_form: props.data2.allow_absent_form,
            allow_appointment: props.data2.allow_appointment,
            allow_gatepass: props.data2.allow_gatepass,
        }
        setLoading(true)
        setBtnLabel('please wait')
        AccountService.updateUserInfo(data, success, error)
    }
    const success = () => {
        setLoading(false)
        setBtnLabel('successfully')
        setTimeout(() => {
            setBtnLabel('save changes')
        }, 3000)
    }
    const error = () => {
        setLoading(false)
        setBtnLabel('error')
        setTimeout(() => {
            setBtnLabel('save changes')
        }, 3000)
    }
    return (
        <div className="flex gap-6">
            <div className="grid gap-6 w-full">
                {/* System Admin and prefect control what students, program heads and faculty can submit. */}
                {['super_admin', 'sub_admin'].includes(props.user.role) &&
                  props.data.user_id != props.user.id &&
                  ['student', 'program_head', 'faculty'].includes(props.data.user_type) &&
                <ProfileSectionWrapper
                    title='Accessibility'
                    icon={User}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="text-[0.9em] flex flex-wrap items-center gap-x-6 gap-y-1">
                            {showUserAccessibility().map((e, i) =>
                                <CheckBoxButton.CheckBox
                                    key={e.val}
                                    label={`Allow to Submit ${e.label}`}
                                    name={`allow_${e.val}`}
                                    id={`allow_${e.val}`}
                                    checked={props.data2[`allow_${e.val}`]}
                                    change={handleCheck}
                                />
                            )}
                        </div>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                            <FormButton type="submit" label={btnLabel} loading={loading} />
                        </Box>
                    </form>
                </ProfileSectionWrapper>}
                <ProfileSectionWrapper title="Personal Information" icon={User}>
                    <div className="">
                        {props.data.username !== undefined && (
                            <Label
                                title="Username"
                                desc={`@${props.data.username}`}
                            />
                        )}
                        {!['super_admin', 'sub_admin'].includes(props.data.user_type) &&
                        <>
                        <Label
                            title="Sex"
                            desc={`${props.data.sex === 'm' ? 'Male' : 'Female'}`}
                        />

                        {!isStaffRole &&
                        <>
                        <Label
                            title="Date of Birth"
                            desc={(props.data.date_of_birth != null) ? readableDate(props.data.date_of_birth) : 'N/A'}
                        />
                        <Label
                            title="Age"
                            desc={(props.data.age != null) ? `${props.data.age} years old` : 'N/A'}
                        />
                        </>}
                        </>}
                        <Label
                            title="User Role"
                            desc={`${replaceUnderScoreToSpace(props.data.user_type.toUpperCase())}${roleSuffix() ? ` (${roleSuffix().toUpperCase()})` : ''}`}
                        />
                        {(['program_head', 'faculty'].includes(props.data.user_type) && props.data.unique_att?.program != null) && (
                            <Box sx={LABEL_ROW}>
                                <Typography sx={LABEL_TITLE}>
                                    {(props.data.unique_att.programs_handled?.length > 1) ? 'Programs Handled:' : 'Program:'}
                                </Typography>
                                <Stack spacing={1} sx={{ mt: 0.5 }}>
                                    {(props.data.unique_att.programs_handled?.length > 0
                                        ? props.data.unique_att.programs_handled
                                        : [props.data.unique_att.program]
                                    ).map((p) => (
                                        <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Avatar src={getProgramLogo(p.logo)} alt="" sx={{ width: 24, height: 24 }} />
                                            <Typography sx={LABEL_VALUE}>{p.name ?? p.code}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        {!['super_admin', 'sub_admin'].includes(props.data.user_type) && !isStaffRole &&
                        <>
                        <Label
                            title="Religion"
                            desc={(props.data.religion) ? toTitleCase(props.data.religion) : 'N/A'}
                        />
                        <Label
                            title="Citizenship"
                            desc={(props.data.citizenship) ? toTitleCase(props.data.citizenship) : 'N/A'}
                        />
                        <Label
                            title="Civil Status"
                            desc={`${toTitleCase(props.data.civil_status)}`}
                        />
                        <Label
                            title="Place of Birth"
                            desc={props.data.place_of_birth || 'N/A'}
                        /></>}
                    </div>
                </ProfileSectionWrapper>
                <ProfileSectionWrapper title="Contact Information" icon={Home}>
                    <div className="">
                        {/* Everyone's contact details show here, the prefect's
                            included (same as the System Admin's). */}
                        <Stack spacing={1.5}>
                            <AddressDisplay
                                title="Current Address"
                                address={props.data.current_address}
                            />
                            <AddressDisplay
                                title="Permanent Address"
                                address={props.data.permanent_address}
                            />
                        </Stack>
                        {/* Left out of the data entirely when the viewer may not see them
                            (a student viewing a sibling's profile). */}
                        {props.data.email !== undefined && (
                            <Label
                                title="Email"
                                desc={props.data.email || 'N/A'}
                            />
                        )}
                        {props.data.phone_number !== undefined && (
                            <Label
                                title="Phone Number"
                                desc={props.data.phone_number || 'N/A'}
                            />
                        )}
                    </div>
                </ProfileSectionWrapper>
                {((props.data.user_type === 'student') || props.data.user_type === 'parent') && (
                    <>
                        <ProfileSectionWrapper
                            title={`Family Background ${props.family.family_code != null ? `(${props.family.family_code})` : ''}`}
                            icon={Users}
                        >
                            {(props.family['members']['parent'].length !== 0 && props.family['members']['child'].length !== 0) ? (
                                <Stack spacing={2}>
                                    <UserGroupSection
                                        title="Parents:"
                                        list={props.family.members.parent}
                                    />
                                    <UserGroupSection
                                        title="Children:"
                                        list={props.family.members.child}
                                    />
                                </Stack>
                            ) : (
                                <Typography sx={EMPTY}>No Family Yet</Typography>
                            )}
                        </ProfileSectionWrapper>
                        {props.data.user_type === 'student' && (
                            <ProfileSectionWrapper
                                title="Educational Background"
                                icon={GraduationCap}
                            >
                                <EducationBackgroundSection
                                    type={'label'}
                                    list={props.educationBackground}
                                    usr={props.user}
                                    student_data={props.data}
                                />
                            </ProfileSectionWrapper>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

// One detail: its title over its value, a divider under it (MUI Typography).
const LABEL_ROW = { py: 1.5, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }
const LABEL_TITLE = { fontWeight: 600, fontSize: "0.9rem", color: "text.secondary" }
const LABEL_VALUE = { fontSize: "0.95rem", color: "text.primary" }
const EMPTY = { textAlign: "center", py: 4, color: "text.secondary" }

const Label = ({ title, desc }) => {
    const displayDesc = (desc == '' || desc == null) ? 'N/A' : desc
    return (
        <Box sx={LABEL_ROW}>
            <Typography sx={LABEL_TITLE}>{title}:</Typography>
            <Typography component="div" sx={{ ...LABEL_VALUE, mt: 0.5 }}>{displayDesc}</Typography>
        </Box>
    )
}

const AddressDisplay = ({ title, address }) => {
    const isDefault = !address || address === 'place,city,province,zipcode'
    const parts = isDefault ? ['N/A', 'N/A', 'N/A', 'N/A'] : address.split(',')
    const labels = ['Place', 'City', 'Province', 'Zipcode']

    return (
        <Box sx={{ pb: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography sx={{ ...LABEL_TITLE, mb: 1.5 }}>{title}:</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                {labels.map((label, index) => (
                    <Box key={index}>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 500, color: "text.secondary" }}>{label}:</Typography>
                        <Typography sx={LABEL_VALUE}>{parts[index] || 'N/A'}</Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

const UserGroupSection = ({ title, list }) => {
    const { isUserOnline } = useContext(AuthContext);

    return (
        <Box>
            <Typography sx={LABEL_TITLE}>{title}</Typography>
            <List disablePadding>
                {list.map((e, i) => (
                    <MuiRow
                        key={e.id ?? i}
                        divider={false}
                        href={profileUrl(e)}
                        avatar={
                            <ProfilePic
                                size={2.5}
                                src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)}
                                showActive={true}
                                isActive={isUserOnline(e.id) || checkActiveStatus(e.last_seen)}
                            />
                        }
                        primary={`${e.profile?.first_name ?? ''} ${e.profile?.last_name ?? ''}`}
                        secondary={showUserType(e, true)}
                        sx={{ "& .MuiListItemButton-root": { px: 1 } }}
                    />
                ))}
            </List>
        </Box>
    )
}

const SCHOOL = {
    name: "Pilar College of Zamboanga City Inc",
    address: "R.T. Lim Boulevard, Cawa Cawa, Zamboanga City",
}

const EducationBackgroundSection = ({ type, list, student_data, program, usr, validationErr }) => {
    const [data, setData] = useState({
        // Senior high defaults to this school too, but the student can change it.
        sh_school_name: list[0]?.school_name || SCHOOL.name,
        sh_school_address: list[0]?.school_address || SCHOOL.address,
        sh_year_graduated: list[0]?.year_graduated || '',
        // Current college is always this school — fixed, not editable
        // (the server stores the same values regardless of what's sent).
        college_school_name: SCHOOL.name,
        college_school_address: SCHOOL.address,
        college_year_graduated: list[1]?.year_graduated || '',
        college_program: student_data['unique_att']?.['program']?.['id'] || '',
        tr_college_school_name: list[2]?.school_name || '',
        tr_college_school_address: list[2]?.school_address || '',
        tr_college_year_graduated: list[2]?.year_graduated || '',
        tr_college_program: list[2]?.program || '',
        date_last_attended: list[2]?.date_attended || '',
        year_level: list[2]?.year_level || ''
    })

    switch(type) {
        case 'label':
            return list.length !== 0
                ? <EducationTimeline list={list} student_data={student_data} />
                : <Typography sx={EMPTY}>No Education Background Yet</Typography>
        case 'form':
            return (
                <div className="space-y-6">
                    <h1 className="text-xl font-bold">Edit Education Background</h1>
                    <div className="space-y-6">
                        <EducationBackgroundFieldSection
                            title="senior_high_school"
                            data={data}
                            setData={setData}
                            validationErr={validationErr}
                        />
                        <EducationBackgroundFieldSection
                            user={usr}
                            title="college"
                            data={data}
                            program={program}
                            setData={setData}
                            validationErr={validationErr}
                        />
                        <EducationBackgroundFieldSection
                            title="college"
                            data={data}
                            user={usr}
                            setData={setData}
                            transferee={true}
                            validationErr={validationErr}
                        />
                    </div>
                </div>
            )
    }
}

// The student's schooling as a short timeline, newest first: current
// college, previous college (transferee), senior high. Each stop: the level,
// the school and its address, then its details in a compact grid.
const EducationTimeline = ({ list, student_data }) => {
    const rank = (e) => e.education_type === 'college' ? (e.transferee ? 1 : 0) : 2
    // A previous-college entry with nothing filled in (not a transferee) is left out.
    const entries = [...list]
        .filter((e) => !(e.education_type === 'college' && e.transferee && !e.school_name && !e.program))
        .sort((a, b) => rank(a) - rank(b))

    return (
        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {entries.map((e, i) => {
                const current = e.education_type === 'college' && !e.transferee
                const last = i === entries.length - 1
                return (
                    <Box component="li" key={i} sx={{ display: "flex", gap: 2 }}>
                        {/* dot + line down to the next stop */}
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", flexShrink: 0, bgcolor: current ? "primary.main" : "grey.400", boxShadow: (t) => `0 0 0 4px ${current ? t.palette.primary.light + "33" : t.palette.action.selected}` }} />
                            {!last && <Box sx={{ flex: 1, width: 2, bgcolor: "action.selected", mt: 1 }} />}
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0 : 3 }}>
                            <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: current ? "var(--tone-blue-fg)" : "text.secondary" }}>
                                    {e.education_type === 'senior_high_school' ? 'Senior High School' : e.transferee ? 'Previous College' : 'College'}
                                </Typography>
                                {current && <Chip size="small" color="primary" label="Current" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600 }} />}
                                {e.education_type === 'college' && !!e.transferee && <Chip size="small" variant="outlined" label="Transferee" sx={{ height: 20, fontSize: "0.68rem" }} />}
                            </Stack>
                            <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: "1rem", lineHeight: 1.35 }}>{e.school_name || 'N/A'}</Typography>
                            {e.school_address && (
                                <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, mt: 0.25, color: "text.secondary" }}>
                                    <MapPin size={13} style={{ flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: "0.82rem" }}>{e.school_address}</Typography>
                                </Stack>
                            )}
                            <Box sx={{ mt: 1.75 }}>
                                {current && <ProgramHeader program={student_data?.unique_att?.program} />}
                                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, minmax(0, 1fr))" } }}>
                                    {educationDetails(e, student_data).map(([label, value]) => (
                                        <Box key={label} sx={{ minWidth: 0, ...(label === 'Program' && { gridColumn: "1 / -1" }) }}>
                                            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}>{label}</Typography>
                                            <Typography component="div" sx={{ fontSize: "0.88rem", wordBreak: "break-word", color: value ? "text.primary" : "text.secondary" }}>{value || 'N/A'}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}

// The current program: its logo (from the program table) beside its name
// and code, above the rest of the details.
const ProgramHeader = ({ program }) => {
    const name = program?.name ?? program?.code
    if (!name) return null
    return (
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.75, pb: 1.75, mb: 1.75, borderBottom: 1, borderColor: "divider" }}>
            <Avatar src={getProgramLogo(program.logo)} alt="" sx={{ width: 56, height: 56, bgcolor: "background.paper", border: 1, borderColor: "divider", flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: "1rem", fontWeight: 600, lineHeight: 1.35 }}>{name}</Typography>
                {program?.code && program.code !== name && <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{program.code}</Typography>}
            </Box>
        </Stack>
    )
}

// [label, value] pairs shown for one education entry.
const educationDetails = (e, student_data) => {
    if (e.education_type === 'senior_high_school') return [['Year Graduated', e.year_graduated]]
    if (e.transferee) {
        return [
            ['Program', e.program],
            ['Date Last Attended', e.date_attended ? readableDate(e.date_attended) : null],
            ['Year Level', e.year_level],
        ]
    }
    // Current college: where they are now (latest enrollment), plus Year
    // Graduated for graduates retaking a program.
    const enr = student_data?.unique_att?.enrollments
    const latest = enr?.[enr.length - 1]
    return [
        ['School Year', latest?.school_year?.year],
        ['Semester', latest?.semester ? `${ordinal(latest.semester)} Semester` : null],
        ['Year Level', latest?.year_level ? getYearLevel(latest.year_level) : null],
        ...(e.year_graduated ? [['Year Graduated', e.year_graduated]] : []),
    ]
}

const EducationBackgroundFieldSection = ({ title, user, data, program, setData, transferee, validationErr }) => {
    const sh = (title === 'senior_high_school')
    const type = sh ? 'sh' : (transferee ? 'tr_college' : 'college')

    return (
        <div className="">
            <h2 className="text-lg font-semibold mb-4">{transferee ? 'College (If Transferee)' : replaceUnderScoreToSpace(toTitleCase(title))}</h2>
            <div className="space-y-4">
                <FormTextfield
                    label="School Name"
                    name={`${type}_school_name`}
                    id={`${type}_school_name`}
                    val={sh ? data.sh_school_name : data[`${type}_school_name`]}
                    change={(e) => change(e, setData)}
                    readOnly={type === 'college'}
                    req={sh || (!transferee)}
                    error={validationErr?.[`${type}_school_name`]}
                    errorAsterisk={validationErr?.[`${type}_school_nameAsterisk`]}
                />
                <FormTextfield
                    label="School Address"
                    name={`${type}_school_address`}
                    id={`${type}_school_address`}
                    val={sh ? data.sh_school_address : data[`${type}_school_address`]}
                    change={(e) => change(e, setData)}
                    readOnly={type === 'college'}
                    req={sh || (!transferee)}
                    error={validationErr?.[`${type}_school_address`]}
                    errorAsterisk={validationErr?.[`${type}_school_addressAsterisk`]}
                />
                <div className={`grid grid-cols-1 ${(sh) ? 'md:grid-cols-1' : (transferee) ? 'md:grid-cols-1' : ((!transferee && (user.role == 'super_admin' || user.role == 'sub_admin')) ? 'md:grid-cols-2' : 'md:grid-cols-1')} gap-4`}>
                    <FormTextfield
                        label={transferee ? 'Date Last Attended' : (type === 'college' ? 'Year Graduated (Optional)' : 'Year Graduated')}
                        name={transferee ? 'date_last_attended' : `${type}_year_graduated`}
                        id={transferee ? 'date_last_attended' : `${type}_year_graduated`}
                        val={transferee ? data.date_last_attended : (sh ? data.sh_year_graduated : data[`${type}_year_graduated`])}
                        type={transferee ? 'date' : 'text'}
                        change={(e) => change(e, setData)}
                        req={sh || (!transferee)}
                        error={validationErr?.[transferee ? 'date_last_attended' : `${type}_year_graduated`]}
                        errorAsterisk={validationErr?.[transferee ? 'date_last_attendedAsterisk' : `${type}_year_graduatedAsterisk`]}
                    />
                    {!sh && (
                        <>
                            {(!transferee && (user.role == 'super_admin' || user.role == 'sub_admin')) ? (
                                <DropdownField
                                    default={{ val: '', label: 'Select Program' }}
                                    list={program}
                                    name="college_program"
                                    val={data.college_program}
                                    onChange={(e) => change(e, setData)}
                                    error={validationErr?.college_program}
                                    errorAsterisk={validationErr?.college_programAsterisk}
                                    titleCase={true}
                                />
                            ) : (
                                <>
                                    {transferee &&
                                    <>
                                    <FormTextfield
                                        label="Program / Course"
                                        name={`${type}_program`}
                                        id={`${type}_program`}
                                        val={data.tr_college_program}
                                        change={(e) => change(e, setData)}
                                        req={true}
                                        error={validationErr?.[`${type}_program`]}
                                        errorAsterisk={validationErr?.[`${type}_programAsterisk`]}
                                    />
                                    <FormTextfield
                                        label="Year Level"
                                        name="year_level"
                                        id="year_level"
                                        val={data.year_level}
                                        change={(e) => change(e, setData)}
                                        req={true}
                                        error={validationErr?.year_level}
                                        errorAsterisk={validationErr?.[`year_levelAsterisk`]}
                                    />
                                    </>}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

About.EducationBackgroundSection = EducationBackgroundSection
export default About
