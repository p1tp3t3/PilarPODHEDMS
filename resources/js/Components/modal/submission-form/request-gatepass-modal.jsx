import UpModal from "../up-modal"
import CheckBoxButton from "../../input/checkbox"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "../../button/button"
import { showOutputModal, showWarningModal } from "../../../others/function"
import { GatePassService } from "@/others/services/gatepass-service"
import { useState } from "react"
import RadioButton from "@/Components/input/radio"

const RequestGatePassModal = (props) => {

    const [data, setData] = useState({
        user_id: props.user_id,
        other_reason: "",
    });
    const [err, setErr] = useState('')

    const handleCheck = (e) => {
        const form = e.target.form || e.currentTarget.closest("form") || document;
        const checked = form.querySelectorAll('input[name="reason[]"]:checked');
        const values = Array.from(checked).map((input) => input.value);
    
        setData((prev) => ({
            ...prev,
            reason: values
        }));
    }
    const handleSubmit = e => {
        e.preventDefault()
        if(data.other_reason != '') {
            setErr('')
            showWarningModal(
                'Are You Sure You Want To Request a Gate Pass?',
                'Request Gate Pass',
                'Cancel',
                () => {
                    props.reload(true, "text-wait", "Your Gate Pass is Processing")
                    GatePassService.request(data, success, error)
                }
            )
        }else {
            setErr('Reason is Required.')
        }
    }
    const success = (e) => {
        props.reload(true, '')
        showOutputModal(
            "Gate Pass Sent Successfully to the Prefect",
            's',
            () => {
                props.reload(false)
                props.closeModal(false)
                setData((prev) => ({
                    ...prev,
                    other_reason: "",
                }))
            }
        )
    }
    const error = (e) => {
        const errors = e.response?.data?.errors
        const m = errors ? Object.values(errors)[0]?.[0] : e.response?.data?.message
        props.reload(true, '')
        showOutputModal(
            m || 'There was an error. Please try again.',
            'e',
            () => {
                props.reload(false)
            }
        )
    }
    return (
        <UpModal
            close={props.close} 
            isEnableOuterClose={props.isEnableOuterClose}
            closeModal={props.closeModal}
            pd={props.pd}
            bgColor='bg-white'
            w='w-[28rem]'>
            <div className="w-full">
                <div className="w-full">
                    <form method="post" onSubmit={handleSubmit}>
                        <div className="grid gap-2">
                            <div className="text-[1.2em] pb-3">
                                <h1><b>Request Gate Pass Slip</b></h1>
                            </div>
                            <div className="grid gap-3">
                                <div>
                                    <RichTextEditor
                                        label='Reason to Request'
                                        val={data.other_reason}
                                        error={err}
                                        change={(html) => setData((prev) => ({ ...prev, other_reason: html }))}
                                        minHeight="8rem"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <FormButton label='Send' type="submit" />
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    )
}
export default RequestGatePassModal