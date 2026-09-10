import UpModal from "../up-modal"
import DropdownField from "@/Components/input/dropdown"
import FormButton from "@/Components/button/button"
import { useState, useEffect } from "react"
import { AccountService } from "@/others/services/account-service"

const POSITIONS = [
    "Registrar", "Guard", "Guidance", "Librarian",
    "Nurse", "Administrative Staff", "Maintenance Staff", "Security Personnel",
]

const AssignPositionModal = (props) => {
    const [position, setPosition] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (props.data != null) {
            setPosition(props.data.non_teaching_staff?.position ?? "")
            setError("")
        }
    }, [props.data])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!position) {
            setError("Please select a position.")
            return
        }

        AccountService.assignStaffPosition(
            { user_id: props.data.id, position },
            () => {
                props.closeModal(false)
                props.onDone?.()
            },
            (err) => setError(err.response?.data?.message ?? "Failed to assign position.")
        )
    }

    return (
        <UpModal
            close={props.close}
            pd={["px-8", "py-6"]}
            isEnableOuterClose={props.close}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[26rem]"
            cntr={true}
        >
            <form onSubmit={handleSubmit} className="w-full grid gap-4">
                <h1 className="text-[1.1em]">
                    <b>Assign Position — {props.data?.profile?.first_name} {props.data?.profile?.last_name}</b>
                </h1>
                <DropdownField
                    default={{ val: "", label: "Select Position" }}
                    list={POSITIONS.map((p) => ({ val: p, label: p }))}
                    val={position}
                    onChange={(e) => setPosition(e.target.value)}
                    name="position"
                    titleCase={true}
                    error={error}
                />
                <FormButton type="submit" label="Save Position" />
            </form>
        </UpModal>
    )
}

export default AssignPositionModal
