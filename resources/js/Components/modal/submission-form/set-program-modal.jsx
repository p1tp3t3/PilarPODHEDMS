import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import ProfilePicEdit from "@/Components/input/profile-pic-edit-input"
import { change, fileChange, getProgramLogo, showOutputModal, showWarningModal } from "@/others/function"
import { useState, useEffect } from "react"
import FormButton from "@/Components/button/button"
import { ProgramService } from "@/others/services/program-service"

const SetProgramModal = (props) => {
    const action = props.action || 'add'
    const editData = props.data || {}
    // The code and full name are fixed once a program is created.
    const locked = action === 'edit'

    const [data, setData] = useState({
        id: '',
        code: '',
        name: '',
        color: '',
        logo: null,
    })
    const [preview, setPreview] = useState(null)

    const [validationErr, setValidationErr] = useState({
        code: "",
        codeAsterisk: false,
        name: "",
        nameAsterisk: false,
        color: "",
        colorAsterisk: false,
    })

    // Every time the form opens: Edit fills it from the chosen program, Add
    // starts blank — so a cancelled edit never leaks into the next "Add".
    useEffect(() => {
        if (!props.close) return
        const d = action === 'edit' ? (props.data || {}) : {}
        setData({
            id: d.id || '',
            code: d.code || '',
            name: d.name || '',
            color: d.color_code || '',
            logo: null,
        })
        setPreview(null)
        setValidationErr({ code: "", codeAsterisk: false, name: "", nameAsterisk: false, color: "", colorAsterisk: false })
    }, [props.close, action, props.data])

    const handleLogoChange = (e) => {
        fileChange(e, setPreview, (file) => setData((prev) => ({ ...prev, logo: file })), true)
    }

    const validate = () => {
        let err = {
            code: "",
            codeAsterisk: false,
            name: "",
            nameAsterisk: false,
            color: "",
            colorAsterisk: false,
        }

        if (!data.code.trim()) {
            err.code = "Program code is required."
            err.codeAsterisk = true
        }

        if (!data.name.trim()) {
            err.name = "Program name is required."
            err.nameAsterisk = true
        }

        if (!data.color || !/^#([0-9A-F]{3}){1,2}$/i.test(data.color)) {
            err.color = "Invalid color code."
            err.colorAsterisk = true
        }

        setValidationErr(err)
        return !(err.code || err.name || err.color)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validate()) return

        const loadingMsg = action === 'add'
            ? 'Creating New Program. Please Wait'
            : 'Updating Program. Please Wait'

        const successMsg = action === 'add'
            ? 'New Program Created Successfully'
            : 'Program Updated Successfully'

        showWarningModal(
            action === 'add' ? 'Are You Sure You Want To Add A Program?' : 'Are You Sure You Want To Update A Program?',
            action === 'add' ? 'Add Program' : 'Update Program',
            'Cancel',
            () => {
                props.reload(true, 'text-wait', loadingMsg)

                // Built as real FormData (not the plain-object pattern used
                // elsewhere) so the logo File actually transmits — axios
                // only serializes multipart correctly from a FormData
                // instance, not a plain object with a File property.
                const formData = new FormData()
                formData.append('id', data.id)
                if (!locked) {
                    formData.append('code', data.code)
                    formData.append('name', data.name)
                }
                formData.append('color', data.color)
                if (data.logo) formData.append('logo', data.logo)

                // SweetAlert result; OK clears the loading overlay (and, on
                // success, closes this form — the list is already updated
                // through props.setter).
                ProgramService.save(action, formData, props.setter,
                    () => {
                        props.reload(true, '')
                        showOutputModal(successMsg, 's', () => {
                            props.reload(false)
                            props.closeModal(false)
                        })
                    },
                    (e) => {
                        props.reload(true, '')
                        showOutputModal('Failed. ' + (e?.response?.data?.message || ''), 'e', () => props.reload(false))
                    }
                )
            }
        )
    }

    const handleChange = (e) => {
        change(e, setData)
        validate()
    }

    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor='bg-white'
            w='w-[25rem]'
            cntr={true}
        >
            <div className="w-full">
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-5">
                        <div className="text-[1.2em] text-center">
                            <h1><b>{action === 'add' ? "Add New Program" : "Edit Program"}</b></h1>
                        </div>

                        <div className="grid gap-5">
                            <div className="grid place-items-center">
                                <ProfilePicEdit
                                    preview={preview}
                                    setPreview={setPreview}
                                    profilePic={getProgramLogo(editData.logo)}
                                    handleFileChange={handleLogoChange}
                                    profileChange={(file) => setData((prev) => ({ ...prev, logo: file }))}
                                    enableCrop={true}
                                />
                            </div>

                            <div className="grid gap-3">

                                {/* `code`, e.g. BSIT. Read-only when editing. */}
                                <FormTextfield
                                    label='Program Code'
                                    name='code'
                                    val={data.code}
                                    change={handleChange}
                                    errorEmpty="Please enter program code."
                                    error={validationErr.code}
                                    errorAsterisk={validationErr.codeAsterisk}
                                    readOnly={locked}
                                />

                                <div className="flex flex-col gap-1 text-[0.8em]">
                                    <label htmlFor="">Color Code</label>
                                    <input 
                                        type="color" 
                                        name="color" 
                                        value={data.color} 
                                        onChange={handleChange}
                                        className={`w-full h-[2.5rem] p-1 border rounded ${validationErr.colorAsterisk ? "border-red-500" : "border-gray-300"}`}
                                    />
                                    {validationErr.color && (
                                        <span className="text-red-500 text-[0.75em]">{validationErr.color}</span>
                                    )}
                                </div>

                                {/* `name`, the full name. Read-only when editing. */}
                                <FormTextfield
                                    label='Program Name'
                                    name='name'
                                    val={data.name}
                                    change={handleChange}
                                    errorEmpty="Please enter program name."
                                    error={validationErr.name}
                                    errorAsterisk={validationErr.nameAsterisk}
                                    readOnly={locked}
                                />
                                {locked && (
                                    <p className="text-[0.75em] text-gray-500 -mt-1">
                                        The program code and name can't be changed. Only the logo and color can be edited.
                                    </p>
                                )}

                            </div>

                            <div className="grid">
                                <FormButton 
                                    label={action === 'add' ? 'Submit' : 'Update'} 
                                    type='submit'
                                />
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default SetProgramModal
