import RichTextEditor from "@/Components/input/rich-text-editor"
import UpModal from "../up-modal"
import { showWarningModal, showOutputModal } from "@/others/function"
import { useState } from "react"
import FormButton from "@/Components/button/button"
import { AbsentFormService } from "@/others/services/absent-form-service"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"

const NoteAbsentFormModal = (props) => {
    const MySwal = withReactContent(Swal)
    const [data, setData] = useState({
        note: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        showWarningModal(
            'Are You Sure You Want To Note This Absent Form?',
            'Note Absent Form',
            'Cancel',
            () => {
                props.reload(true, 'text-wait', 'Noting Absent Form Is Processing')
                AbsentFormService.note(props.id, data, props.setter, success, error)
            }
        )
    }
    const success = () => {
        props.reload(true, '')
        showOutputModal(
            'Absent Form Is Noted Successfully',
            's',
            () => {
                props.closeModal(false)
                props.reload(false)
            }
        )
    }
    const error = (e) => {
        props.reload(true, '')
        showOutputModal(
            'Failed to Process Noting Absent Form. Please Try Again.',
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
            w='w-[35rem]'>
            <div className="grid gap-3">
                <div className="text-[1.2em]">
                    <h1><b>Note Student Absent Form</b></h1>
                </div>
                <form onSubmit={handleSubmit} className="grid gap-3">
                    <div>
                        <RichTextEditor
                            label='Set Remarks'
                            change={(html) => setData((prev) => ({ ...prev, note: html }))}
                            val={data.note}
                            minHeight="8rem"
                        />
                    </div>
                    <div className="flex justify-end">
                        <FormButton label='Note' type="submit" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default NoteAbsentFormModal