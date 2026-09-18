import UpModal from "../up-modal"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "../../button/button"
import { showWarningModal } from "../../../others/function"
import { useState } from "react"

const SetReasonModal = (props) => {

    const [err, setErr] = useState('')

    const handleChange = (html) => {
        props.setData(prev => ({ ...prev, reason: html }))
    }
    const handleSubmit = e => {
        e.preventDefault()
        if(props.data.reason != '') {
            setErr('')
            showWarningModal(
                props.warning.title,
                props.warning.btn,
                'Cancel',
                () => {
                    props.sendData()
                }
            )
        }else {
            setErr('Reason is Required.')
        }
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
                            <div className="grid gap-3">
                                <div>
                                    <RichTextEditor
                                        label={props.title}
                                        val={props.data.reason}
                                        error={err}
                                        change={handleChange}
                                        req={true}
                                        minHeight="10rem"
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
export default SetReasonModal