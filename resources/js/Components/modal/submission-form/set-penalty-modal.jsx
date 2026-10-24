import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import { showOutputModal, showWarningModal } from "@/others/function"
import { useState, useEffect } from "react"
import FormButton from "@/Components/button/button"
import { ViolationService } from "@/others/services/violation-service"

// Next free whole reference number after the existing penalties (1.0, 2.0 … → 6.0).
const nextRef = (list = []) => {
    const max = Math.max(0, ...list.map((p) => Math.floor(Number(p.ref_number) || 0)))
    return `${max + 1}.0`
}

const REF_PATTERN = /^\d{1,3}(\.\d)?$/

const SetPenaltyModal = (props) => {
    const [data, setData] = useState({ ref_number: "", description: "" })
    const [errors, setErrors] = useState({})

    // Fresh form every time it opens, with the next reference number suggested.
    useEffect(() => {
        if (!props.close) return
        setData({ ref_number: nextRef(props.list), description: "" })
        setErrors({})
    }, [props.close])

    const validate = () => {
        const err = {}
        const ref = data.ref_number.trim()
        if (!ref) err.ref_number = "Reference number is required."
        else if (!REF_PATTERN.test(ref)) err.ref_number = "Use a number like 6 or 1.4."
        else if ((props.list ?? []).some((p) => Number(p.ref_number) === Number(ref))) err.ref_number = "That reference number is already used."
        if (!data.description.trim()) err.description = "Penalty name is required."
        else if (data.description.trim().length > 191) err.description = "Penalty name must be at most 191 characters."
        setErrors(err)
        return Object.keys(err).length === 0
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validate()) return

        showWarningModal(
            'Are You Sure You Want To Add A Penalty?',
            'Add Penalty',
            'Cancel',
            () => {
                props.reload(true, 'text-wait', 'Creating New Penalty')
                ViolationService.createPenalty(
                    { ref_number: data.ref_number.trim(), description: data.description.trim() },
                    props.setter,
                    () => {
                        props.reload(true, '')
                        showOutputModal('New Penalty Created Successfully', 's', () => {
                            props.reload(false)
                            props.closeModal(false)
                        })
                    },
                    (e) => {
                        props.reload(true, '')
                        const msg = e?.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : e?.response?.data?.message
                        showOutputModal('Failed. ' + (msg || ''), 'e', () => props.reload(false))
                    }
                )
            }
        )
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setData((d) => ({ ...d, [name]: value }))
        setErrors((x) => ({ ...x, [name]: undefined }))
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
                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-5">
                        <div className="text-[1.2em] text-center">
                            <h1><b>Add New Penalty</b></h1>
                        </div>

                        <div className="grid gap-3">
                            <FormTextfield
                                label='Reference No. (e.g. 6 or 1.4)'
                                name='ref_number'
                                id='penalty_ref_number'
                                val={data.ref_number}
                                change={handleChange}
                                error={errors.ref_number}
                                errorAsterisk={!!errors.ref_number}
                            />
                            <FormTextfield
                                label='Penalty Name'
                                name='description'
                                id='penalty_description'
                                val={data.description}
                                change={handleChange}
                                error={errors.description}
                                errorAsterisk={!!errors.description}
                            />
                        </div>
                        <div className="grid">
                            <FormButton label='Submit' type='submit' />
                        </div>
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default SetPenaltyModal
