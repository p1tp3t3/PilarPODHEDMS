import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { showWarningModal, showOutputModal } from "@/others/function"
import { GatePassService } from "@/others/services/gatepass-service"

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

        if (reason.trim() === "") {
            setError("Reason is required.")
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
            router.reload({ only: ["user_gatepass"] })
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
                <div className="text-[1.2em] pb-3">
                    <h1><b>Edit Your Gate Pass Request</b></h1>
                    <p className="text-[0.75em] text-gray-500 mt-1">
                        You can only edit this request once, and only while it's still pending.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-3">
                    <FormTextfield
                        type="textarea"
                        label="Reason to Request"
                        name="reason"
                        id="reason"
                        val={reason}
                        error={error}
                        errorAsterisk={error !== "" ? true : ""}
                        change={(e) => setReason(e.target.value)}
                        color={{ border: "border-blue-700", bg: "bg-gray-200" }}
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
