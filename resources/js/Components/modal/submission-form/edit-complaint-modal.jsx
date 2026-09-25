import UpModal from "../up-modal"
import RichTextEditor from "../../input/rich-text-editor"
import FormButton from "../../button/button"
import '../style.css'
import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import SearchUserBar from "@/Components/input/search-user-bar"
import DropdownField from "../../input/dropdown"
import { ComplaintService } from "@/others/services/complaint-service"
import { showOutputModal, showWarningModal, getProfilePic, toTitleCase } from "@/others/function"
import PicVidUpload from "@/Components/input/pic-vid-upload"
import ProfilePic from "@/Components/other/profile-pic"
import { X } from "lucide-react"

const safeParseArray = (value) => {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string' || value === '') return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const EditComplaintModal = (props) => {
    const [search, setSearch] = useState(""),
          [selectedStudents, setSelectedStudents] = useState([]),
          [incident, setIncident] = useState(''),
          [description, setDescription] = useState(''),
          [existingEvidence, setExistingEvidence] = useState([]),
          [originalEvidenceFiles, setOriginalEvidenceFiles] = useState([]),

          [picture_list, setPictureList] = useState([]),
          [req_picture_list, setReqPictureList] = useState([]),

          [video_list, setVideoList] = useState([]),
          [req_video_list, setReqVideoList] = useState([]),
          [uploadError, setUploadError] = useState(''),

          [validationError, setValidationError] = useState({
              subject: '',
              reason: ''
          })

    useEffect(() => {
        if (props.close && props.data) {
            setSelectedStudents(
                (props.data.complaintSubject || []).map((s) => s.user).filter(Boolean)
            )
            setIncident(props.data.incident_id ?? '')
            setDescription(props.data.complaint_description ?? '')
            const visibleEvidence = safeParseArray(props.data.complaint_evidences).filter((e) => !e.hidden)
            setExistingEvidence(visibleEvidence)
            setOriginalEvidenceFiles(visibleEvidence.map((e) => e.file))
            setPictureList([])
            setReqPictureList([])
            setVideoList([])
            setReqVideoList([])
            setUploadError('')
            setValidationError({ subject: '', reason: '' })
        }
    }, [props.close, props.data])

    // "Removing" existing evidence only hides it going forward — it's a log,
    // the file/record itself is never deleted (see updateComplaint()).
    const removeExistingEvidence = (file) => {
        setExistingEvidence((prev) => prev.filter((e) => e.file !== file))
    }

    const handleSearch = (e) => setSearch(e.target.value)

    const getSelectedStudent = (i) => {
        const select = props.student_list.find((e) => e.id == i)
        setSelectedStudents((prev) => {
            if (prev.some((student) => student.id === select.id)) return prev
            return [...prev, select]
        })
        setSearch('')
    }
    const removeStudent = (i) => {
        setSelectedStudents((prev) => prev.filter((e, index) => index !== i))
    }

    const validateForm = () => {
        const errors = { subject: '', reason: '' }
        if (selectedStudents.length === 0) errors.subject = "This Is Required. Please Specify The Subject Of Complaint"
        if (description.trim() === '') errors.reason = "This Is Required. Please State Your Reason To Complaint"

        setValidationError(errors)
        return errors.subject === '' && errors.reason === ''
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validateForm()) return

        const f = new FormData()
        selectedStudents.forEach((s, i) => f.append(`student_subjects[${i}]`, s.id))
        f.append('complaint_description', description)
        f.append('incident_id', incident)
        const keptFiles = existingEvidence.map((e) => e.file)
        const hiddenFiles = originalEvidenceFiles.filter((file) => !keptFiles.includes(file))
        f.append('hidden_evidence_files', JSON.stringify(hiddenFiles))
        const concatFileList = req_picture_list.concat(req_video_list)
        concatFileList.forEach((file, index) => f.append(`evidence[${index}]`, file))

        showWarningModal(
            'Save Changes To This Complaint? You Will Not Be Able To Edit It Again.',
            'Save Changes',
            'Cancel',
            () => {
                props.reload(true, "text-wait", "Saving Your Changes")
                ComplaintService.update(props.data.id, f, success, error)
            }
        )
    }

    const success = () => {
        props.reload(true, '')
        showOutputModal("Complaint Updated Successfully", "s", () => {
            props.reload(false)
            props.closeModal(false)
            router.reload({ only: ['complaint_list'] })
        })
    }
    const error = (e) => {
        props.reload(true, '')
        showOutputModal(toTitleCase(e?.response?.data?.message) || "There was an Error. Please Try Again", "e", () => {
            props.reload(false)
        })
    }

    return (
        <UpModal
            close={props.close}
            pd={["px-10", "py-4"]}
            isEnableOuterClose={props.isEnableOuterClose}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[40rem] sm:w-[45rem]"
        >
            <div className="w-full">
                <div className="pt-2 text-[1.1em] sm:text-[1.2em]">
                    <h1><b>Edit Your Complaint</b></h1>
                    <p className="text-[0.75em] text-gray-500 mt-1">
                        You can only edit this complaint once. Evidence you've already uploaded will be kept — new files are added on top of it.
                    </p>
                </div>
                <div className="py-3 w-full">
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <div className="w-full relative z-10">
                                <div className="text-[0.9em]"></div>
                                <div className="relative">
                                    <SearchUserBar
                                        setSearch={setSearch}
                                        name="student_search"
                                        search={search}
                                        plc="Search Student/s as the Subject of Complaint"
                                        handleSearch={handleSearch}
                                        lim={4}
                                        list={selectedStudents}
                                        def="Student Not Found"
                                        withLink={false}
                                        click={getSelectedStudent}
                                        apiLink="/api/all-users/student"
                                    />
                                </div>
                                <div className="text-[#d12323] text-[12px]">
                                    <b>{validationError.subject}</b>
                                </div>
                            </div>
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

                        <div className="w-full relative">
                            <div className="grid gap-3 relative">
                                <DropdownField.Search
                                    default={{ val: '', label: 'Select Incident' }}
                                    list={props.incident_list}
                                    onChange={(e) => setIncident(e.target.value)}
                                    name="complaint_incident"
                                    val={incident}
                                    req={false}
                                />
                            </div>
                        </div>

                        <RichTextEditor
                            label="State Your Reason About the Complaint"
                            val={description}
                            change={setDescription}
                            error={validationError.reason}
                            minHeight="12rem"
                        />

                        <div className="grid gap-2">
                            <div className="text-[0.9em] font-semibold">Evidence (Optional)</div>
                            <PicVidUpload
                                type='pic'
                                label="5 JPEG or PNG File Only"
                                multiple={true}
                                def='Upload Pics Here Up To 2MB'
                                fileList={picture_list}
                                existingList={existingEvidence.filter((e) => e.type !== 'vid').map((e) => ({
                                    key: e.file,
                                    type: e.type,
                                    src: `/complaint/${props.data.id}/evidence/${e.file}`,
                                    href: `/complaint/${props.data.id}/evidence/${e.file}`,
                                }))}
                                onRemoveExisting={removeExistingEvidence}
                                name='pic_evidence'
                                id='edit_pic_file'
                                reqFileList={req_picture_list}
                                setFileList={setPictureList}
                                setReqFileList={setReqPictureList}
                                maximumSize={2}
                                maxCount={5}
                                onError={(msg) => setUploadError(msg)}
                            />
                            <PicVidUpload
                                type='vid'
                                label="Up To 2 Videos, 3 Minutes Each Max"
                                multiple={true}
                                def='Upload Videos Here Up To 40MB'
                                fileList={video_list}
                                existingList={existingEvidence.filter((e) => e.type === 'vid').map((e) => ({
                                    key: e.file,
                                    type: e.type,
                                    src: `/complaint/${props.data.id}/evidence/${e.file}`,
                                    href: `/complaint/${props.data.id}/evidence/${e.file}`,
                                }))}
                                onRemoveExisting={removeExistingEvidence}
                                name='vid_evidence'
                                id='edit_vid_file'
                                reqFileList={req_video_list}
                                setFileList={setVideoList}
                                setReqFileList={setReqVideoList}
                                maximumSize={40}
                                maxCount={2}
                                maxDurationSeconds={180}
                                onError={(msg) => setUploadError(msg)}
                            />
                            {uploadError && (
                                <div className="text-[#d12323] text-[12px]">
                                    <b>{uploadError}</b>
                                </div>
                            )}
                        </div>

                        <div className="w-full flex justify-end pt-2">
                            <FormButton label='Save Changes' type="submit" />
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    )
}

export default EditComplaintModal
