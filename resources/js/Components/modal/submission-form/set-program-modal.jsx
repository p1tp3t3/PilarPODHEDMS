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

    const [data, setData] = useState({
        id: '',
        name: '',
        description: '',
        color: '',
        logo: null,
    })
    const [preview, setPreview] = useState(null)

    const [validationErr, setValidationErr] = useState({
        name: "",
        nameAsterisk: false,
        description: "",
        descriptionAsterisk: false,
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
            name: d.name || '',
            description: d.description || '',
            color: d.color_code || '',
            logo: null,
        })
        setPreview(null)
        setValidationErr({ name: "", nameAsterisk: false, description: "", descriptionAsterisk: false, color: "", colorAsterisk: false })
    }, [props.close, action, props.data])

    const handleLogoChange = (e) => {
        fileChange(e, setPreview, (file) => setData((prev) => ({ ...prev, logo: file })), true)
    }

    const validate = () => {
        let err = {
            name: "",
            nameAsterisk: false,
            description: "",
            descriptionAsterisk: false,
            color: "",
            colorAsterisk: false,
        }

        if (!data.name.trim()) {
            err.name = "Program name is required."
            err.nameAsterisk = true
        }

        if (!data.description.trim()) {
            err.description = "Program acronym is required."
            err.descriptionAsterisk = true
        }

        if (!data.color || !/^#([0-9A-F]{3}){1,2}$/i.test(data.color)) {
            err.color = "Invalid color code."
            err.colorAsterisk = true
        }

        setValidationErr(err)
        return !(err.name || err.description || err.color)
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
                formData.append('name', data.name)
                formData.append('description', data.description)
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

                                <FormTextfield
                                    label='Program Name'
                                    name='name'
                                    val={data.name}
                                    change={handleChange}
                                    errorEmpty="Please enter program name."
                                    error={validationErr.name}
                                    errorAsterisk={validationErr.nameAsterisk}
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

                                <FormTextfield
                                    label='Program Acronym'
                                    name='description'
                                    val={data.description}
                                    change={handleChange}
                                    errorEmpty="Please enter program acronym."
                                    error={validationErr.description}
                                    errorAsterisk={validationErr.descriptionAsterisk}
                                />

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
