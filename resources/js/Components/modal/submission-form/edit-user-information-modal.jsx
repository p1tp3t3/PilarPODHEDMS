import UpModal from "../up-modal"
import CheckBoxButton from "@/Components/input/checkbox"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { AccountService } from "@/others/services/account-service"
import { useState, useEffect } from "react"
import { change, check, checkUserExist, fileChange, toTitleCase } from "@/others/function"
import { requestType } from "@/others/list/type-list"
import { Validator } from "@/others/classes/validator"
import DropdownField from "@/Components/input/dropdown"


const EditUserInfoModal = (props) => {
    const [preview, setPreview] = useState(null),
          [commonPasswordList, setCommonPasswordList] = useState([]),
          [validationErr, setValidationError] = useState({}),
          [exists, setExist] = useState(false)

    const [data, setData] = useState({
        username: '',
        password: '',
        user_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        user_type: ''
    })
    useEffect(() => {
        fetch('/storage/list/common-password.txt')
        .then(res => res.text())
        .then(data => {
            const lines = data.split(/\r?\n/).filter(Boolean);
            setCommonPasswordList(new Set(lines));
        })
        .catch(x => console.log(x))
    }, [])
    useEffect(() => {
        if(props.data != null) {
            setData((prev) => ({
                ...prev,
                username: props.data.username,
                user_id: props.data.id,
                first_name: props.data.first_name,
                middle_name: props.data.middle_name,
                last_name: props.data.last_name,
                user_type: props.data.user_type,
                allow_complaint: props.data.allow_complaint,
                allow_referral: props.data.allow_referral,
                allow_absent_form: props.data.allow_absent_form,
                allow_appointment: props.data.allow_appointment,
                allow_gatepass: props.data.allow_gatepass,
            }))
            setPreview(null)
        }
    }, [props.data])
    const handleSubmit = (e) => {
        e.preventDefault()
        const validator = new Validator(data, data.user_type)

        const errors = validator.validateUserAccount(commonPasswordList)
        const isErrorFree = Object.values(errors).every(err => err === '')
        console.log(errors)

        setValidationError(errors)

        if(!isErrorFree || (exists && props.data.username != data.username)) {
            return
        }
        setExist(false)

        props.reload(true, 'text-wait', `${((props.data != null) ? props.data.first_name : '')}'s Account is Updating. Please Wait`)
        AccountService.updateUserInfo(data, success, error)
    }
    const success = () => {
        props.reload(true, 'success', `${((props.data != null) ? props.data.first_name : '')}'s Account Update Successfully.`)
        setTimeout(() => {
            props.reload(false)
            //window.location.href = `/super-admin/user-accounts`
        }, 3000)
    }
    const error = () => {
        props.reload(true, 'error', "Failed to Update Account.")
        setTimeout(() => {
            props.reload(false)
        }, 3000)
    }
    const handleChange = (e) => {
        change(e, setData)
    }
    const handleFileChange = (event) => {
        fileChange(event, setPreview, handleProfileChange, true);
    };
    const handleCheck = (e) => {
        check(e, setData, 'bool')
    }
    const handleProfileChange = (e) => {
        setData((prev) => ({
            ...prev, profile_picture: e
        }))
    }
    const showUserAccessibility = () => {
        let access = false
        switch(data.user_type) {
            case 'student':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint' ||
                     e.val == 'absent_form' ||
                     e.val == 'gatepass')
                )
            case 'teaching_staff':
                return requestType.filter((e, i) =>
                    (e.val == 'complaint' ||
                     e.val == 'gatepass')
                )
            case 'administrative':
                return requestType.filter((e, i) => 
                    (e.val == 'complaint' || 
                     e.val == 'referral' || 
                     e.val == 'gatepass')
                )
            case 'parent':
                return requestType.filter((e, i) => 
                    (e.val == 'complaint')
                )
            case 'staff':
                return requestType.filter((e, i) => 
                    (e.val == 'complaint' || 
                     e.val == 'gatepass')
                )
            default:
                return requestType
        }
    }
    const generatePassword = (length) => {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*_+<>?';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        setData((prev) => ({
            ...prev,
            password: result
        }))
    }
    const userType = (props.data != null) ? props.data.user_type : ''
    return (
        <UpModal
            close={props.close}
            pd={["px-10", "py-4"]}
            isEnableOuterClose={props.close}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[35rem]"
            cntr={true}
        >
            <div className="w-full">
                <form
                    onSubmit={handleSubmit}
                    method="post"
                    className="w-full grid gap-4"
                >
                    <div>
                        <h1 className="text-[1.3em] text-center">
                            <b>Edit {toTitleCase((props.data != null) ? props.data.first_name : '')}'s Information</b>
                        </h1>
                        <br />
                    </div>
                    <div className="w-full flex flex-col sm:flex-row gap-2">
                        <FormTextfield
                            label="First Name"
                            name="first_name"
                            id="first_name"
                            val={data.first_name}
                            change={handleChange}
                            error={validationErr.first_name}
                            errorAsterisk={validationErr.first_nameAsterisk}
                        />
                        <FormTextfield
                            label="Middle Name"
                            name="middle_name"
                            id="middle_name"
                            val={data.middle_name}
                            change={handleChange}
                            error={validationErr.middle_name}
                            errorAsterisk={validationErr.middle_nameAsterisk}
                        />
                        <FormTextfield
                            label="Last Name"
                            name="last_name"
                            id="last_name"
                            val={data.last_name}
                            change={handleChange}
                            error={validationErr.last_name}
                            errorAsterisk={validationErr.last_nameAsterisk}
                        />
                    </div>
                    {(data.user_type == 'student' || data.user_type == 'faculty' || data.user_type == 'administrative') &&
                    <div className="flex flex-col sm:flex-row gap-3">
                        <DropdownField
                            default={{ val: '', label: 'Select Program' }}
                            list={[
                                { val: 1, label: 'BSIT' },
                                { val: 2, label: 'BLIS' },
                                { val: 3, label: 'BEED' },
                            ]}
                        />
                        {data.user_type == 'student' &&
                        <DropdownField
                            default={{ val: '', label: 'Select Year Level' }}
                            list={[
                                { val: 1, label: '1st Year' },
                                { val: 2, label: '2nd Year' },
                                { val: 3, label: '3rd Year' },
                                { val: 4, label: '4th Year' },
                            ]}
                        />}
                    </div>}
                    {/**
                    <div className="w-full grid gap-5">
                        <FormTextfield
                            label="Username"
                            name="username"
                            id="username"
                            val={data.username}
                            change={handleChange}
                            error={validationErr.username}
                            errorAsterisk={validationErr.usernameAsterisk}
                            setExist={setExist}
                            checkExists={(value) => checkUserExist("username", value)}
                        />
                        <div className="flex gap-2">
                            <FormTextfield
                                label="Password"
                                name="password"
                                id="password"
                                type="password"
                                val={data.password}
                                change={handleChange}
                                enableShowPassword={true}
                                error={validationErr.password}
                                errorAsterisk={validationErr.passwordAsterisk}
                            />
                            <div>
                                <button 
                                    type="button" 
                                    onClick={() => generatePassword(15)}
                                    className="bg-gray-200 hover:bg-gray-300 rounded text-[0.7em] py-2"
                                >
                                    Generate Password
                                </button>
                            </div>
                        </div>
                    </div>
                     */}
                    {userType != 'itrc' &&
                    <div className="grid gap-3">
                        <div><h1><b>Accessibility</b></h1></div>
                        <div className="text-[0.9em] flex flex-wrap items-center gap-x-6 gap-y-1">
                            {showUserAccessibility().map((e, i) =>
                                <CheckBoxButton.CheckBox
                                    key={e.val}
                                    label={`Allow to Submit ${e.label}`}
                                    name={`allow_${e.val}`}
                                    id={`allow_${e.val}`}
                                    change={handleCheck}
                                    checked={data[`allow_${e.val}`]}
                                />
                            )}
                        </div>
                    </div>}
                    <div className="grid">
                        <FormButton type="submit" label="Save Changes" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}
export default EditUserInfoModal