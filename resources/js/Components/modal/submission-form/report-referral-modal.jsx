import UpModal from "../up-modal"
import SearchUserBar from "@/Components/input/search-user-bar"
import ProfilePic from "@/Components/other/profile-pic"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "@/Components/button/button"
import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { getProfilePic, showWarningModal, showOutputModal, toTitleCase } from "@/others/function"
import { ReferralService } from "@/others/services/referral-service"
import { X } from "lucide-react"

const ReportReferralModal = (props) => {
    const [search, setSearch] = useState("")
    const [selectedStudents, setSelectedStudents] = useState([])
    const [reason, setReason] = useState("")
    const [error, setError] = useState("")

    // Reset the form each time the modal is reopened rather than staying
    // mounted-with-stale-state across separate referral submissions.
    useEffect(() => {
        if (props.close) {
            setSelectedStudents([])
            setReason("")
            setSearch("")
            setError("")
        }
    }, [props.close])

    const handleSearch = (e) => setSearch(e.target.value)

    const getSelectedStudent = (i) => {
        const select = props.students.find((e) => e.id == i)
        setSelectedStudents((prev) => {
            if (prev.some((student) => student.id === select.id)) return prev
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
        setError("")

        const f = new FormData()
        f.append("referrer_id", props.user.id)
        f.append("referred_student_id", selectedStudents[0].id)
        selectedStudents.forEach((s, i) => f.append(`referred_students[${i}]`, s.id))
        f.append("referral_reason", reason)

        showWarningModal(
            "Are You Want to Refer a Student?",
            "Refer Student",
            "Cancel",
            () => {
                props.reload(true, "text-wait", "Your Referral is Processing")
                ReferralService.create(f, success, error2)
            }
        )
    }

    const success = () => {
        props.reload(true, "")
        showOutputModal("Referral Created Successfully", "s", () => {
            props.reload(false)
            props.closeModal(false)
            router.reload({ only: ["referral"] })
        })
    }

    const error2 = () => {
        props.reload(true, "")
        showOutputModal("Failed to Process Referral. Please Try Again", "e", () => props.reload(false))
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
                    <h1><b>Referral Report</b></h1>
                    <p className="text-[0.75em] text-gray-500 mt-1">Refer a student to the Prefect of Discipline</p>
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
                                apiLink={`/api/all-users/${props.user.role == "administrative" ? "program_student" : "student"}`}
                                user={props.user}
                            />
                        </div>
                        {error && <div className="text-[#d12323] text-[12px]"><b>{error}</b></div>}
                        <div className="flex overflow-y-hidden overflow-x-auto w-full pt-2">
                            {selectedStudents.map((e, i) => (
                                <SelectedUser key={e.id} src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)} name={[e.profile?.first_name, e.profile?.last_name]} user={e} unselect={removeStudent} index={i} />
                            ))}
                        </div>
                    </div>

                    <RichTextEditor
                        label="Reason to Refer"
                        val={reason}
                        change={setReason}
                        req={true}
                        placeholder="Describe the reason for this referral in detail — this will appear on the referral document sent to Guidance."
                        minHeight="16rem"
                    />

                    <div className="flex justify-end">
                        <FormButton type="submit" label="Submit Referral" />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

const SelectedUser = (props) => {
    const isStudent = props.user.role == "student"
        ? `${props.user.program?.name}`
        : toTitleCase(props.user.parent?.parent_role)
    return (
        <div className="flex-shrink-0 grid relative w-[5rem]">
            <div className="justify-self-center grid">
                <div className="grid w-[2.5rem] justify-self-center relative">
                    <div className="absolute -top-1 right-0 z-[5]">
                        <button
                            type="button"
                            className="bg-gray-300 w-[1.2rem] h-[1.2rem] rounded-full text-[0.8em]"
                            onClick={() => props.unselect(props.index)}
                        >
                            <X size={12} />
                        </button>
                    </div>
                    <div className="justify-self-center">
                        <ProfilePic src={props.src} size={2.5} />
                    </div>
                </div>
                <div className="text-[0.7em] text-center">
                    <h1><b>{`${props.name[0]} ${props.name[1]} (${isStudent})`}</b></h1>
                </div>
            </div>
        </div>
    )
}

export default ReportReferralModal
