import React, { useState, useContext } from "react"
import ProfileSectionWrapper from "@/wrapper/profile-section-wrapper"
import { change, check, checkActiveStatus, getProfilePic, getProgramLogo, getYearLevel, ordinal, readableDate, replaceUnderScoreToSpace, toTitleCase } from "@/others/function"
import SelectedUser from "@/Components/other/selected-user"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { AccountService } from "@/others/services/account-service"
import AuthContext from "@/context-provider/auth-provider"
import { Link } from "@inertiajs/react"
import CheckBoxButton from "@/Components/input/checkbox"
import { requestType } from "@/others/list/type-list"
import DropdownField from "@/Components/input/dropdown"
import { User, Home, Users, GraduationCap } from "lucide-react"

const About = (props) => {
    const [editEducationBackground, enableEditEducationBackground] = useState('label'),
          [loading, setLoading] = useState(false),
          [btnLabel, setBtnLabel] = useState('save changes')

    // Teaching and non-teaching staff don't collect date of birth/religion/
    // citizenship/civil status/place of birth (see edit-profile-modal.jsx
    // and Validator.validateUpdateProfileForm) — hide them here too rather
    // than showing "N/A" for fields these roles never ask for.
    const isStaffRole = ['teaching_staff', 'non_teaching_staff'].includes(props.data.user_type)

    // "TEACHING STAFF (PROGRAM HEAD)" / "TEACHING STAFF (FACULTY)" for
    // teaching staff, "NON TEACHING STAFF (GUARD)" etc. for non-teaching —
    // same parenthetical-position treatment for both.
    const roleSuffix = () => {
        if (props.data.user_type === 'teaching_staff') {
            return props.data.unique_att?.position === 'program_head' ? 'Program Head' : 'Faculty'
        }
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
            case 'teaching_staff':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint')
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
                {((props.user.role == 'super_admin' && props.data.user_id != props.user.id) ||
                  (props.user.role == 'sub_admin' && props.data.user_id != props.user.id && props.data.user_type == 'student')) &&
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
                        <div className="flex justify-end">
                            <FormButton type="submit" label={btnLabel} loading={loading} />
                        </div>
                    </form>
                </ProfileSectionWrapper>}
                <ProfileSectionWrapper title="Personal Information" icon={User}>
                    <div className="">
                        <Label
                            title="Username"
                            desc={`@${props.data.username}`}
                        />
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
                        {(props.data.user_type === 'teaching_staff' && props.data.unique_att?.program != null) && (
                            <div className="border-b border-gray-200 py-3 last:border-b-0">
                                <div className="font-semibold text-gray-700">
                                    {(props.data.unique_att.programs_handled?.length > 1) ? 'Programs Handled:' : 'Program:'}
                                </div>
                                <div className="text-gray-900 mt-1 grid gap-2">
                                    {(props.data.unique_att.programs_handled?.length > 0
                                        ? props.data.unique_att.programs_handled
                                        : [props.data.unique_att.program]
                                    ).map((p) => (
                                        <div key={p.id} className="flex items-center gap-2">
                                            <img
                                                src={getProgramLogo(p.logo)}
                                                alt=""
                                                className="w-6 h-6 rounded-full object-cover"
                                            />
                                            <div>{p.description ?? p.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(props.data.user_type === 'student' && props.data.unique_att?.enrollments?.length > 0) && (
                            <>
                            <Label
                                title="School Year"
                                desc={props.data.unique_att.enrollments[props.data.unique_att.enrollments.length - 1].school_year?.year}
                            />
                            <Label
                                title="Semester"
                                desc={(() => {
                                    const semester = props.data.unique_att.enrollments[props.data.unique_att.enrollments.length - 1].semester
                                    return semester ? `${ordinal(semester)} Semester` : 'N/A'
                                })()}
                            />
                            </>
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
                        {!['super_admin', 'sub_admin'].includes(props.data.user_type) &&
                        <div className="grid gap-3">
                            <AddressDisplay
                                title="Current Address"
                                address={props.data.current_address}
                            />
                            <AddressDisplay
                                title="Permanent Address"
                                address={props.data.permanent_address}
                            />
                        </div>}
                        <Label
                            title="Email"
                            desc={props.data.email || 'N/A'}
                        />
                        {!['super_admin', 'sub_admin'].includes(props.data.user_type) &&
                        <Label
                            title="Phone Number"
                            desc={props.data.phone_number || 'N/A'}
                        />}
                    </div>
                </ProfileSectionWrapper>
                {((props.data.user_type === 'student') || props.data.user_type === 'parent') && (
                    <>
                        <ProfileSectionWrapper
                            title={`Family Background ${props.family.family_code != null ? `(${props.family.family_code})` : ''}`}
                            icon={Users}
                        >
                            {(props.family['members']['parent'].length !== 0 && props.family['members']['child'].length !== 0) ? (
                                <div className="space-y-4">
                                    <UserGroupSection
                                        title="Parents:"
                                        list={props.family.members.parent}
                                    />
                                    <UserGroupSection
                                        title="Children:"
                                        list={props.family.members.child}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No Family Yet
                                </div>
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

const Label = ({ title, desc }) => {
    const displayDesc = (desc == '' || desc == null) ? 'N/A' : desc
    return (
        <div className="border-b border-gray-200 py-3 last:border-b-0">
            <div className="font-semibold text-gray-700">{title}:</div>
            <div className="text-gray-900 mt-1">
                <div>{displayDesc}</div>
            </div>
        </div>
    )
}

const AddressDisplay = ({ title, address }) => {
    const isDefault = !address || address === 'place,city,province,zipcode'
    const parts = isDefault ? ['N/A', 'N/A', 'N/A', 'N/A'] : address.split(',')
    const labels = ['Place', 'City', 'Province', 'Zipcode']

    return (
        <div className="border-b border-gray-200 pb-4">
            <div className="font-semibold text-gray-700 mb-3">{title}:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labels.map((label, index) => (
                    <div key={index} className="flex flex-col">
                        <span className="text-sm font-medium text-gray-600">{label}:</span>
                        <span className="text-gray-900">{parts[index] || 'N/A'}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const UserGroupSection = ({ title, list }) => {
    const { isUserOnline } = useContext(AuthContext);

    return (
        <div className="space-y-3">
            <div className="font-semibold text-gray-700">{title}</div>
            <div className="space-y-3">
                {list.map((e, i) => (
                    <Link key={i} href={`/profile/${e.username}`} className="block">
                        <SelectedUser
                            user={e}
                            src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)}
                            name={[e.profile?.first_name, e.profile?.last_name]}
                            showParentRole={true}
                            showActive={true}
                            activeStatus={isUserOnline(e.id) || checkActiveStatus(e.last_seen)}
                        />
                    </Link>
                ))}
            </div>
        </div>
    )
}

const EducationBackgroundSection = ({ type, list, student_data, program, usr, validationErr }) => {
    const [data, setData] = useState({
        sh_school_name: list[0]?.school_name || '',
        sh_school_address: list[0]?.school_address || '',
        sh_year_graduated: list[0]?.year_graduated || '',
        college_school_name: list[1]?.school_name || '',
        college_school_address: list[1]?.school_address || '',
        college_year_graduated: list[1]?.year_graduated || '',
        college_program: student_data['unique_att']?.['program']?.['id'] || '',
        tr_college_school_name: list[2]?.school_name || '',
        tr_college_school_address: list[2]?.school_address || '',
        tr_college_year_graduated: list[2]?.year_graduated || '',
        tr_college_program: list[2]?.program || '',
        date_last_attended: list[2]?.date_attended || '',
        year_level: list[2]?.year_level || ''
    })

    const isTransferee = (educationType, transferee) => {
        return (educationType !== 'senior_high_school') ? (transferee ? "(Transferee)" : "") : ''
    }

    switch(type) {
        case 'label':
            return (
                <div className="space-y-6">
                    {list.length !== 0 ? (
                        list.map((e, i) => (
                            <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <h2 className="text-lg font-bold mb-3">{replaceUnderScoreToSpace(toTitleCase(e.education_type))} {isTransferee(e.education_type, e.transferee)}</h2>
                                <div className="space-y-3">
                                    <Label title="School Name" desc={e.school_name}/>
                                    <Label title="School Address" desc={e.school_address}/>
                                    {e.education_type !== 'senior_high_school' && (
                                        <Label title='Program' desc={(e.education_type === 'college' && !e.transferee) ? (student_data?.unique_att?.program?.description ?? student_data?.unique_att?.program?.name) : e.program} />
                                    )}
                                    {e.education_type === 'college' && e.transferee ? (
                                        <>
                                            <Label title="Date Last Attended" desc={(e.date_attended != null) ? readableDate(e.date_attended) : 'N/A'} />
                                            <Label title="Year Level" desc={e.year_level || 'N/A'} />
                                        </>
                                    ) : (
                                        <Label title="Year Graduated" desc={e.year_graduated || 'N/A'} />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No Education Background Yet
                        </div>
                    )}
                </div>
            )
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
                    req={sh || (!transferee)}
                    error={validationErr?.[`${type}_school_address`]}
                    errorAsterisk={validationErr?.[`${type}_school_addressAsterisk`]}
                />
                <div className={`grid grid-cols-1 ${(sh) ? 'md:grid-cols-1' : (transferee) ? 'md:grid-cols-1' : ((!transferee && (user.role == 'super_admin' || user.role == 'sub_admin')) ? 'md:grid-cols-2' : 'md:grid-cols-1')} gap-4`}>
                    <FormTextfield
                        label={transferee ? 'Date Last Attended' : 'Year Graduated'}
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
