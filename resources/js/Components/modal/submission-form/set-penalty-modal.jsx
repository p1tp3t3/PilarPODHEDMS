import UpModal from "../up-modal"
import { Box, Typography } from "@mui/material"
import FormTextfield from "@/Components/input/form-input"
import { showOutputModal, showWarningModal } from "@/others/function"
import { useState, useEffect } from "react"
import FormButton from "@/Components/button/button"
import { ViolationService } from "@/others/services/violation-service"
import { Validator } from "@/others/classes/validator"

// Next free whole reference number after the existing penalties (1.0, 2.0 … → 6.0).
const nextRef = (list = []) => {
    const max = Math.max(0, ...list.map((p) => Math.floor(Number(p.ref_number) || 0)))
    return `${max + 1}.0`
}


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
        const err = Validator.penalty(data, props.list)
        setErrors(err)
        return !Validator.hasErrors(err)
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
            <Box sx={{ width: "100%" }}>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "grid", gap: 2.5 }}>
                        <Typography component="h1" sx={{ fontSize: "1.2rem", fontWeight: 700, textAlign: "center" }}>
                            Add New Penalty
                        </Typography>

                        <Box sx={{ display: "grid", gap: 1.5 }}>
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
                        </Box>
                        <FormButton label='Submit' type='submit' />
                </Box>
            </Box>
        </UpModal>
    )
}

export default SetPenaltyModal
