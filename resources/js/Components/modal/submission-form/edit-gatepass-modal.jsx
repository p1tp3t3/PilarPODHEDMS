import UpModal from "../up-modal"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "@/Components/button/button"
import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { showWarningModal, showOutputModal } from "@/others/function"
import { GatePassService } from "@/others/services/gatepass-service"
import { validateForm, hasErrors, required, minLength } from "@/others/validation"

const EditGatePassModal = (props) => {
    const [reason, setReason] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (props.close && props.data) {
            setReason(props.data.reason ?? "")
            setError("")
        }
    }, [props.close, props.data])

    const handleSubmit = (e) => {
        e.preventDefault()

        const found = validateForm({ reason }, { reason: [required("Reason"), minLength(5, "Reason")] })
        if (hasErrors(found)) {
            setError(found.reason)
            return
        }
        setError("")

        showWarningModal(
            "Save Changes To This Gate Pass Request? You Will Not Be Able To Edit It Again.",
            "Save Changes",
            "Cancel",
            () => {
                props.reload(true, "text-wait", "Saving Your Changes")
                GatePassService.update(props.data.id, reason, () => {}, success, error2)
            }
        )
    }

    const success = () => {
        props.reload(true, "")
        showOutputModal("Gate Pass Updated Successfully", "s", () => {
            props.reload(false)
            props.closeModal(false)
            router.reload({ only: ["user_gatepass", "latest_gatepass"] })
        })
    }

    const error2 = () => {
        props.reload(true, "")
        showOutputModal("Failed to Update Gate Pass. Please Try Again", "e", () => props.reload(false))
    }

    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor="bg-white"
            w="w-[28rem]"
        >
            <div className="w-full">
                <div className="pt-2 pb-3 text-[1.1em] sm:text-[1.2em]">
                    <h1><b>Edit Your Gate Pass Request</b></h1>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-3">
                    <RichTextEditor
                        label="Reason to Request"
                        val={reason}
                        error={error}
                        change={setReason}
                        req={true}
                        minHeight="10rem"
                    />
                    <div className="flex justify-end">
                        <FormButton label="Save Changes" type="submit" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default EditGatePassModal
