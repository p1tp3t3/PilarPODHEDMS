import UpModal from "../up-modal"
import SearchUserBar from "@/Components/input/search-user-bar"
import ProfilePic from "@/Components/other/profile-pic"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "@/Components/button/button"
import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { getProfilePic, showWarningModal, showOutputModal, toTitleCase, isSamePerson } from "@/others/function"
import { ReferralService } from "@/others/services/referral-service"
import { X } from "lucide-react"
import { validateForm, hasErrors, required, minLength } from "@/others/validation"

const EditReferralModal = (props) => {
    const [search, setSearch] = useState("")
    const [selectedStudents, setSelectedStudents] = useState([])
    const [reason, setReason] = useState("")
    const [error, setError] = useState("")
    const [reasonError, setReasonError] = useState("")

    useEffect(() => {
        if (props.close && props.data) {
            setSelectedStudents(
                (props.data.referralReferredStudent || []).map((s) => s.user).filter(Boolean)
            )
            setReason(props.data.reason_description ?? "")
            setError("")
        }
    }, [props.close, props.data])

    const handleSearch = (e) => setSearch(e.target.value)

    const getSelectedStudent = (i, select) => {
        setSelectedStudents((prev) => {
            if (prev.some((student) => isSamePerson(student, select))) return prev
            return [...prev, select]
        })
        setSearch("")
    }
    const removeStudent = (index) => {
        setSelectedStudents((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        if (selectedStudents.length === 0) {
            setError("Please select at least one student to refer.")
            return
        }
        const found = validateForm({ reason }, { reason: [required("Reason"), minLength(5, "Reason")] })
        setReasonError(found.reason ?? "")
        if (hasErrors(found)) return
        setError("")

        const f = new FormData()
        selectedStudents.forEach((s, i) => f.append(`referred_students[${i}]`, s.id))
        f.append("referral_reason", reason)

        showWarningModal(
            "Save Changes To This Referral? You Will Not Be Able To Edit It Again.",
            "Save Changes",
            "Cancel",
            () => {
                props.reload(true, "text-wait", "Saving Your Changes")
                ReferralService.update(props.data.id, f, () => {}, success, error2)
            }
        )
    }

    const success = () => {
        props.reload(true, "")
        showOutputModal("Referral Updated Successfully", "s", () => {
            props.reload(false)
            props.closeModal(false)
            router.reload({ only: ['referral'] })
        })
    }

    const error2 = () => {
        props.reload(true, "")
        showOutputModal("Failed to Update Referral. Please Try Again", "e", () => props.reload(false))
    }

    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor="bg-white"
            w="w-[40rem] sm:w-[45rem]"
        >
            <div className="w-full">
                <div className="pt-2 text-[1.1em] sm:text-[1.2em]">
                    <h1><b>Edit Your Referral</b></h1>
                    <p className="text-[0.75em] text-gray-500 mt-1">
                        You can only edit this referral once, and only while it's still pending.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="py-3 w-full grid gap-4">
                    <div className="grid gap-2">
                        <label className="text-[0.85em] font-medium text-gray-700">
                            Referred Student/s <span className="text-[#d12323]">*</span>
                        </label>
                        <div className="relative z-10">
                            <SearchUserBar
                                setSearch={setSearch}
                                name="student_search"
                                search={search}
                                plc="Search Student/s as the Referred Student"
                                handleSearch={handleSearch}
                                lim={4}
                                list={selectedStudents}
                                def="Student Not Found"
                                withLink={false}
                                click={getSelectedStudent}
                                apiLink="/api/all-users/student"
                            />
                        </div>
                        {error && <div className="text-[#d12323] text-[12px]"><b>{error}</b></div>}
                        <div className="flex overflow-y-hidden overflow-x-auto w-full pt-2">
                            {selectedStudents.map((e, i) => (
                                <div key={e.id} className="flex-shrink-0 grid relative w-[5rem]">
                                    <div className="justify-self-center grid">
                                        <div className="grid w-[2.5rem] justify-self-center relative">
                                            <div className="absolute -top-1 right-0 z-[5]">
                                                <button
                                                    type="button"
                                                    className="bg-gray-300 w-[1.2rem] h-[1.2rem] rounded-full text-[0.8em]"
                                                    onClick={() => removeStudent(i)}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <div className="justify-self-center">
                                                <ProfilePic src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)} size={2.5} />
                                            </div>
                                        </div>
                                        <div className="text-[0.7em] text-center">
                                            <h1><b>{`${e.profile?.first_name ?? ''} ${e.profile?.last_name ?? ''}`}</b></h1>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <RichTextEditor
                        label="Reason to Refer"
                        val={reason}
                        change={(v) => { setReason(v); setReasonError("") }}
                        req={true}
                        error={reasonError}
                        placeholder="Describe the reason for this referral in detail — this will appear on the referral document sent to Guidance."
                        minHeight="16rem"
                    />

                    <div className="flex justify-end">
                        <FormButton type="submit" label="Save Changes" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default EditReferralModal
