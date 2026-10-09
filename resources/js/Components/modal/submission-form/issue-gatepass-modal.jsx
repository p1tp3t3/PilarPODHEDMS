import UpModal from "../up-modal"
import { useState } from "react"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormTextfield from "@/Components/input/form-input"
import CheckBoxButton from "@/Components/input/checkbox"
import FormButton from "@/Components/button/button"
import SearchUserBar from "@/Components/input/search-user-bar"
import SelectedUser from "@/Components/other/selected-user"
import { GatePassService } from "@/others/services/gatepass-service"
import { change, disablePrevDate, getProfilePic, showOutputModal, showWarningModal } from "@/others/function"

const emptyForm = { user_id: "", reason: "", expiration_date: "", allow_to: [] }

const IssueGatePassModal = (props) => {
    const [data, setData] = useState(emptyForm)
    const [student, setStudent] = useState(null)
    const [search, setSearch] = useState("")
    const [err, setErr] = useState({})

    const selectStudent = (id, user) => {
        setStudent(user)
        setData((prev) => ({ ...prev, user_id: id }))
        setSearch("")
    }

    const handleAllowTo = (e) => {
        const { value, checked } = e.target
        setData((prev) => ({
            ...prev,
            allow_to: checked ? [...prev.allow_to, value] : prev.allow_to.filter((v) => v !== value),
        }))
    }

    const validate = () => {
        const e = {}
        if (!data.user_id) e.user_id = "Please select a student."
        if (!data.reason || data.reason.replace(/<[^>]*>/g, "").trim() === "") e.reason = "Reason is required."
        if (!data.expiration_date) e.expiration_date = "Please select an expiration date."
        else if (new Date(data.expiration_date) <= new Date()) e.expiration_date = "Expiration date cannot be in the past."
        if (data.allow_to.length === 0) e.allow_to = "Please select at least one option."
        setErr(e)
        return Object.keys(e).length === 0
    }

    const reset = () => {
        setData(emptyForm)
        setStudent(null)
        setErr({})
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validate()) return

        showWarningModal(
            `Issue a Gate Pass to ${student.profile?.first_name ?? "this student"}? It will be approved immediately.`,
            "Issue Gate Pass",
            "Cancel",
            () => {
                props.reload(true, "text-wait", "Issuing Gate Pass")
                GatePassService.issue(
                    data,
                    () => {
                        props.reload(true, "")
                        showOutputModal("Gate Pass Issued Successfully", "s", () => {
                            props.reload(false)
                            props.closeModal(false)
                            reset()
                            props.onIssued?.()
                        })
                    },
                    (x) => {
                        const errors = x.response?.data?.errors
                        const m = errors ? Object.values(errors)[0]?.[0] : x.response?.data?.message
                        props.reload(true, "")
                        showOutputModal(m || "Failed to Issue Gate Pass", "e", () => props.reload(false))
                    }
                )
            }
        )
    }

    return (
        <UpModal
            close={props.close}
            isEnableOuterClose={props.isEnableOuterClose}
            closeModal={props.closeModal}
            pd={props.pd}
            bgColor="bg-white"
            w="w-[32rem]"
        >
            <form method="post" onSubmit={handleSubmit} className="grid gap-4">
                <div className="text-[1.2em]">
                    <h1><b>Issue Gate Pass</b></h1>
                    <p className="text-[0.7em] text-gray-500">Gate passes issued by the prefect are approved immediately.</p>
                </div>

                <div className="grid gap-2">
                    {!student
                    ? <div className="w-full relative">
                        <SearchUserBar
                            setSearch={setSearch}
                            name="search_gatepass_student"
                            search={search}
                            plc="Search Student Full Name / ID"
                            handleSearch={(e) => setSearch(e.target.value)}
                            lim={5}
                            def="Students Not Found"
                            withLink={false}
                            click={selectStudent}
                            apiLink="/api/all-users/student"
                        />
                      </div>
                    : <div>
                        <div className="text-[0.8em]">Student:</div>
                        <SelectedUser
                            src={getProfilePic(student.profile?.profile_picture, student.profile?.sex)}
                            name={[student.profile?.first_name, student.profile?.last_name]}
                            user={student}
                            unselect={() => {
                                setStudent(null)
                                setData((prev) => ({ ...prev, user_id: "" }))
                            }}
                        />
                      </div>}
                    {err.user_id && <div className="text-[#d12323] text-[0.8em]"><b>{err.user_id}*</b></div>}
                </div>

                <RichTextEditor
                    label="Reason"
                    val={data.reason}
                    error={err.reason}
                    change={(html) => setData((prev) => ({ ...prev, reason: html }))}
                    minHeight="7rem"
                />

                <div className="grid gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <FormTextfield
                        label="Expiration Date"
                        type="datetime-local"
                        name="expiration_date"
                        id="issue_expiration_date"
                        val={data.expiration_date}
                        change={(e) => change(e, setData)}
                        min={disablePrevDate()}
                        error={err.expiration_date}
                        errorAsterisk={!!err.expiration_date}
                    />
                    <CheckBoxButton
                        label={<b>Allow To</b>}
                        list={[
                            { val: "go-out", label: "Go Out" },
                            { val: "enter", label: "Enter the Campus" },
                        ]}
                        name="allow_to"
                        id="issue_allow_to"
                        val={data.allow_to}
                        change={handleAllowTo}
                    />
                    {err.allow_to && <div className="text-[#d12323] text-[0.8em]"><b>{err.allow_to}*</b></div>}
                </div>

                <div className="flex justify-end">
                    <FormButton label="Submit" type="submit" />
                </div>
            </form>
        </UpModal>
    )
}

export default IssueGatePassModal
